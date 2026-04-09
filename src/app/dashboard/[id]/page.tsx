'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { jsPDF } from 'jspdf'

interface PunchItem {
  id: string
  itemNumber: number
  description: string | null
  status: string
  trade: { id: string; name: string } | null
  subTrade: { id: string; name: string } | null
  area: { id: string; name: string } | null
  photos: { id: string; filename: string; order: number }[]
  statusHistory: { id: string; status: string; note: string | null; createdAt: string; user: { name: string } }[]
}

interface Trade {
  id: string
  name: string
  subTrades: { id: string; name: string }[]
}

interface Area {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  clientName: string | null
  projectNumber: string | null
}

const RESTAURANT_AREAS = [
  'Dining room (main)', 'Private dining room', 'Bar area', 'Lounge / waiting area',
  'Patio / terrace (exterior)', 'Rooftop dining', 'Restrooms', 'Vestibule',
  'Hot line / main cooking area', 'Cold line / salad prep', 'Bakery / pastry section',
  'Expo / plating pass', 'Dishwashing area', 'Walk-in cooler', 'Walk-in freezer',
  'Dry storage', 'Break room (includes lockers)', 'Staff restroom', 'Manager / GM office',
  'Receiving dock / bay', 'Trash & recycling room', 'Grease trap / grease dumpster area',
  'DMARC room', 'Chemical storage (locked)', 'FAC room (Fire Alarm Control)',
  'Utilities & Mechanical / Electrical room', 'Mechanical room (HVAC / boilers)',
  'IT / server room', 'Gas meter room', 'Water shutoff / backflow room',
  'Grease interceptor room (indoor)', 'Rooftop mechanical / HVAC area',
  'Sprinkler riser room', 'Elevator machine room', 'Dumpster enclosure'
]

export default function ProjectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [punchItems, setPunchItems] = useState<PunchItem[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'punchlist' | 'walk' | 'edit'>('punchlist')
  
  const [filters, setFilters] = useState({ status: 'all', trade: 'all', area: 'all' })
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState<PunchItem | null>(null)
  const [showAreasModal, setShowAreasModal] = useState(false)
  const [statusNote, setStatusNote] = useState('')

  const [editForm, setEditForm] = useState({
    tradeId: '',
    subTradeId: '',
    areaId: '',
    description: '',
  })

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session && projectId) {
      fetchProject()
      fetchPunchItems()
      fetchTrades()
    }
  }, [session, projectId])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      }
    } catch (err) {
      console.error('Failed to fetch project:', err)
    }
  }

  const fetchPunchItems = async () => {
    try {
      const params = new URLSearchParams({ projectId })
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.trade !== 'all') params.append('tradeId', filters.trade)
      if (filters.area !== 'all') params.append('areaId', filters.area)

      const res = await fetch(`/api/punch-items?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPunchItems(data)
      }
    } catch (err) {
      console.error('Failed to fetch punch items:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades')
      if (res.ok) {
        const data = await res.json()
        setTrades(data)
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    }
  }

  const fetchAreas = async () => {
    try {
      const res = await fetch(`/api/areas?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setAreas(data)
      }
    } catch (err) {
      console.error('Failed to fetch areas:', err)
    }
  }

  useEffect(() => {
    if (showAreasModal) {
      fetchAreas()
    }
  }, [showAreasModal])

  useEffect(() => {
    fetchPunchItems()
  }, [filters])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = [...photos, ...acceptedFiles].slice(0, 3)
    setPhotos(newPhotos)
    
    const newPreviews = newPhotos.map(file => URL.createObjectURL(file))
    setPhotoPreviews(newPreviews)
  }, [photos])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 3 - photos.length,
  })

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = newPhotos.map(file => URL.createObjectURL(file))
    setPhotos(newPhotos)
    setPhotoPreviews(newPreviews)
  }

  const createDraft = async () => {
    if (photos.length === 0) {
      alert('Please add at least one photo')
      return
    }

    try {
      const formData = new FormData()
      photos.forEach(photo => {
        formData.append('photos', photo)
      })
      formData.append('projectId', projectId)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload photos')
      }

      const uploadedPhotos = await uploadRes.json()

      const res = await fetch('/api/punch-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          photos: uploadedPhotos,
        }),
      })

      if (res.ok) {
        setPhotos([])
        setPhotoPreviews([])
        fetchPunchItems()
        setActiveTab('edit')
      }
    } catch (err) {
      console.error('Failed to create draft:', err)
      alert('Failed to create punch item')
    }
  }

  const updatePunchItem = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/punch-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        fetchPunchItems()
        setShowEditModal(null)
      }
    } catch (err) {
      console.error('Failed to update punch item:', err)
    }
  }

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/punch-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote || undefined,
        }),
      })

      if (res.ok) {
        fetchPunchItems()
        setShowStatusModal(null)
        setStatusNote('')
      }
    } catch (err) {
      console.error('Failed to change status:', err)
    }
  }

  const deletePunchItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const res = await fetch(`/api/punch-items/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchPunchItems()
      }
    } catch (err) {
      console.error('Failed to delete punch item:', err)
    }
  }

  const saveAreas = async (selectedAreas: string[]) => {
    try {
      for (const areaName of selectedAreas) {
        const exists = areas.some(a => a.name === areaName)
        if (!exists) {
          await fetch('/api/areas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              name: areaName,
              isCustom: !RESTAURANT_AREAS.includes(areaName),
            }),
          })
        }
      }
      fetchAreas()
      setShowAreasModal(false)
    } catch (err) {
      console.error('Failed to save areas:', err)
    }
  }

  const openEditModal = (item: PunchItem) => {
    setEditForm({
      tradeId: item.trade?.id || '',
      subTradeId: item.subTrade?.id || '',
      areaId: item.area?.id || '',
      description: item.description || '',
    })
    setShowEditModal(item)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text(project?.name || 'Punch List', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Client: ${project?.clientName || 'N/A'}`, 20, 30)
    doc.text(`Project #: ${project?.projectNumber || 'N/A'}`, 20, 37)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 44)

    doc.setFontSize(14)
    doc.text('Punch List Items', 20, 55)

    let y = 65
    const filteredItems = punchItems.filter(item => {
      if (filters.status !== 'all' && item.status !== filters.status) return false
      if (filters.trade !== 'all' && item.trade?.id !== filters.trade) return false
      if (filters.area !== 'all' && item.area?.id !== filters.area) return false
      return true
    })

    filteredItems.forEach((item, i) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      
      doc.setFontSize(10)
      doc.text(`#${item.itemNumber} - ${item.status}`, 20, y)
      doc.text(`Area: ${item.area?.name || 'N/A'}`, 60, y)
      doc.text(`Trade: ${item.trade?.name || 'N/A'}`, 110, y)
      y += 5
      doc.text(`Description: ${item.description || 'N/A'}`, 20, y)
      y += 10
    })

    doc.save(`${project?.name || 'punch-list'}-export.pdf`)
  }

  const exportCSV = () => {
    const filteredItems = punchItems.filter(item => {
      if (filters.status !== 'all' && item.status !== filters.status) return false
      if (filters.trade !== 'all' && item.trade?.id !== filters.trade) return false
      if (filters.area !== 'all' && item.area?.id !== filters.area) return false
      return true
    })

    const headers = ['Item #', 'Status', 'Area', 'Trade', 'Sub-Trade', 'Description']
    const rows = filteredItems.map(item => [
      item.itemNumber,
      item.status,
      item.area?.name || '',
      item.trade?.name || '',
      item.subTrade?.name || '',
      item.description || '',
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'punch-list'}-export.csv`
    a.click()
  }

  const getStatusBadge = (status: string) => {
    return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
  }

  if (status === 'loading' || loading) {
    return <div className="container page"><p>Loading...</p></div>
  }

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
              ← Back
            </button>
            <div>
              <div className="logo">{project?.name}</div>
              {project?.clientName && (
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{project.clientName}</div>
              )}
            </div>
          </div>
          <nav className="nav">
            <button className="btn btn-secondary" onClick={() => setShowAreasModal(true)}>
              Setup Areas
            </button>
            <button className="btn btn-secondary" onClick={exportPDF}>Export PDF</button>
            <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
          </nav>
        </div>
      </header>

      <main className="page">
        <div className="container">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              className={`btn ${activeTab === 'punchlist' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('punchlist')}
            >
              Punch List
            </button>
            <button
              className={`btn ${activeTab === 'walk' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('walk')}
            >
              Punch Walk
            </button>
            <button
              className={`btn ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('edit')}
            >
              Edit Drafts
            </button>
          </div>

          {activeTab === 'punchlist' && (
            <>
              <div className="filters">
                <div className="filter-group">
                  <select
                    className="select"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="all">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div className="filter-group">
                  <select
                    className="select"
                    value={filters.trade}
                    onChange={(e) => setFilters({ ...filters, trade: e.target.value })}
                  >
                    <option value="all">All Trades</option>
                    {trades.map((trade) => (
                      <option key={trade.id} value={trade.id}>{trade.name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <select
                    className="select"
                    value={filters.area}
                    onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                  >
                    <option value="all">All Areas</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {punchItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📸</div>
                  <h3>No punch items yet</h3>
                  <p>Use Punch Walk mode to capture photos and create items.</p>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>#</th>
                        <th>Status</th>
                        <th>Area</th>
                        <th>Trade</th>
                        <th>Description</th>
                        <th>Photos</th>
                        <th style={{ width: '120px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {punchItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.itemNumber}</td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>{item.area?.name || '-'}</td>
                          <td>{item.trade?.name || '-'}</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description || '-'}
                          </td>
                          <td>
                            {item.photos.length > 0 && (
                              <span style={{ fontSize: '0.75rem' }}>{item.photos.length} photo(s)</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setShowStatusModal(item.id)}
                              >
                                Status
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => openEditModal(item)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => deletePunchItem(item.id)}
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'walk' && (
            <div className="card">
              <h2 className="page-title" style={{ marginBottom: '1rem' }}>Punch Walk Mode</h2>
              <p style={{ color: 'var(--secondary)', marginBottom: '1.5rem' }}>
                Take photos of punch items. Each photo will create a draft item that you can edit later.
              </p>
              
              <div {...getRootProps()} className="upload-zone">
                <input {...getInputProps()} ref={fileInputRef} />
                <p className="upload-zone-text">
                  Drag & drop photos here, or click to select files<br />
                  <small>(Maximum 3 photos per batch)</small>
                </p>
              </div>

              {photoPreviews.length > 0 && (
                <div className="photo-grid" style={{ marginTop: '1rem' }}>
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="photo-item">
                      <img src={preview} alt={`Preview ${index + 1}`} />
                      <button onClick={() => removePhoto(index)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {photoPreviews.length > 0 && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', width: '100%' }}
                  onClick={createDraft}
                >
                  Save as Draft ({photoPreviews.length} photo(s))
                </button>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <div>
              {punchItems.filter(i => i.status === 'DRAFT').length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <h3>No draft items</h3>
                  <p>Use Punch Walk mode to capture photos and create drafts.</p>
                </div>
              ) : (
                <div className="grid grid-2">
                  {punchItems.filter(i => i.status === 'DRAFT').map((item) => (
                    <div key={item.id} className="card">
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span className="badge badge-draft">Draft</span>
                        <span style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>#{item.itemNumber}</span>
                      </div>
                      {item.photos.length > 0 && (
                        <div className="photo-grid" style={{ marginBottom: '1rem' }}>
                          {item.photos.map((photo) => (
                            <div key={photo.id} className="photo-item">
                              <img src={`/api/files/${photo.filename}`} alt="Punch item" />
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="btn btn-primary" onClick={() => openEditModal(item)}>
                        Edit Item
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Change Status</h2>
              <button className="modal-close" onClick={() => setShowStatusModal(null)}>×</button>
            </div>
            <div className="form-group">
              <label className="label">New Status</label>
              <select className="select" id="new-status">
                <option value="OPEN">Open</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Note (optional)</label>
              <textarea
                className="textarea"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add a note about this status change..."
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                const newStatus = (document.getElementById('new-status') as HTMLSelectElement).value
                changeStatus(showStatusModal, newStatus)
              }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Punch Item #{showEditModal.itemNumber}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(null)}>×</button>
            </div>

            <div className="form-group">
              <label className="label">Trade</label>
              <select
                className="select"
                value={editForm.tradeId}
                onChange={(e) => setEditForm({ ...editForm, tradeId: e.target.value })}
              >
                <option value="">Select trade...</option>
                {trades.map((trade) => (
                  <option key={trade.id} value={trade.id}>{trade.name}</option>
                ))}
              </select>
            </div>

            {editForm.tradeId && (trades.find(t => t.id === editForm.tradeId)?.subTrades?.length ?? 0) > 0 && (
              <div className="form-group">
                <label className="label">Sub-Trade</label>
                <select
                  className="select"
                  value={editForm.subTradeId}
                  onChange={(e) => setEditForm({ ...editForm, subTradeId: e.target.value })}
                >
                  <option value="">Select sub-trade...</option>
                  {trades.find(t => t.id === editForm.tradeId)?.subTrades.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="label">Area</label>
              <select
                className="select"
                value={editForm.areaId}
                onChange={(e) => setEditForm({ ...editForm, areaId: e.target.value })}
              >
                <option value="">Select area...</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Description</label>
              <textarea
                className="textarea"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Describe the issue..."
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => updatePunchItem(showEditModal.id, {
                  ...editForm,
                  status: showEditModal.status === 'DRAFT' ? 'OPEN' : undefined,
                })}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAreasModal && (
        <div className="modal-overlay" onClick={() => setShowAreasModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Setup Areas</h2>
              <button className="modal-close" onClick={() => setShowAreasModal(false)}>×</button>
            </div>
            <p style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>
              Select the areas that exist in this project.
            </p>
            <AreaSelector
              selectedAreas={areas.map(a => a.name)}
              onSave={saveAreas}
              allAreas={RESTAURANT_AREAS}
            />
          </div>
        </div>
      )}
    </>
  )
}

function AreaSelector({ selectedAreas, onSave, allAreas }: {
  selectedAreas: string[]
  onSave: (areas: string[]) => void
  allAreas: string[]
}) {
  const [selected, setSelected] = useState<string[]>(selectedAreas)

  const toggle = (area: string) => {
    if (selected.includes(area)) {
      setSelected(selected.filter(a => a !== area))
    } else {
      setSelected([...selected, area])
    }
  }

  return (
    <>
      <div className="checkbox-list">
        {allAreas.map((area) => (
          <label key={area} className="checkbox-item">
            <input
              type="checkbox"
              checked={selected.includes(area)}
              onChange={() => toggle(area)}
            />
            {area}
          </label>
        ))}
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={() => onSave(selected)}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(selected)}>Save Areas</button>
      </div>
    </>
  )
}
