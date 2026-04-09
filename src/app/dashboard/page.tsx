'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  clientName: string | null
  projectNumber: string | null
  updatedAt: string
  projectType: { name: string }
  _count: { punchItems: number }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [projectTypes, setProjectTypes] = useState<any[]>([])
  const [newProject, setNewProject] = useState({
    name: '',
    clientName: '',
    clientAddress: '',
    projectNumber: '',
    projectTypeId: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchProjects()
      fetchProjectTypes()
    }
  }, [session])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectTypes = async () => {
    try {
      const res = await fetch('/api/project-types')
      if (res.ok) {
        const data = await res.json()
        setProjectTypes(data)
      }
    } catch (err) {
      console.error('Failed to fetch project types:', err)
    }
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name || !newProject.projectTypeId) {
      return
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })

      if (res.ok) {
        const project = await res.json()
        setShowNewProject(false)
        setNewProject({ name: '', clientName: '', clientAddress: '', projectNumber: '', projectTypeId: '' })
        router.push(`/dashboard/${project.id}`)
      }
    } catch (err) {
      console.error('Failed to create project:', err)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container page"><p>Loading...</p></div>
  }

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <div className="logo">Punch List</div>
          <nav className="nav">
            <span style={{ fontSize: '0.875rem' }}>{session?.user?.name || session?.user?.username}</span>
            <button className="btn btn-secondary" onClick={() => signOut({ callbackUrl: '/login' })}>
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="page">
        <div className="container">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="page-title">My Projects</h1>
              <p className="page-subtitle">Manage your punch list projects</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>
              + New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No projects yet</h3>
              <p>Click &quot;New Project&quot; to create your first punch list project.</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => router.push(`/dashboard/${project.id}`)}
                >
                  <h3 className="project-card-title">{project.name}</h3>
                  <p className="project-card-meta">
                    {project.projectType.name}
                    {project.clientName && ` • ${project.clientName}`}
                  </p>
                  <p className="project-card-meta">
                    Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                  <span className="project-card-count">
                    {project._count.punchItems} items
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button className="modal-close" onClick={() => setShowNewProject(false)}>×</button>
            </div>

            <form onSubmit={createProject}>
              <div className="form-group">
                <label className="label">Project Name *</label>
                <input
                  type="text"
                  className="input"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Project Type *</label>
                <select
                  className="select"
                  value={newProject.projectTypeId}
                  onChange={(e) => setNewProject({ ...newProject, projectTypeId: e.target.value })}
                  required
                >
                  <option value="">Select type...</option>
                  {projectTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name.charAt(0) + type.name.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Client Name</label>
                <input
                  type="text"
                  className="input"
                  value={newProject.clientName}
                  onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Client Address</label>
                <input
                  type="text"
                  className="input"
                  value={newProject.clientAddress}
                  onChange={(e) => setNewProject({ ...newProject, clientAddress: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Project Number</label>
                <input
                  type="text"
                  className="input"
                  value={newProject.projectNumber}
                  onChange={(e) => setNewProject({ ...newProject, projectNumber: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewProject(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
