import React, { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000'

type ResultItem = any

const CATEGORIES = [
  { id: 'technology', label: 'Technology (MASS & Autonomy)', terms: [
    'Maritime Autonomous Surface Ship*','Autonomous Ship*','Autonomous vessel*','Unmanned Ship*','Remote Ship*','smart ship*','Autonomous shipping','Remotely Operated Ship','Autonomous merchant ship*','Remote Operation Centre*','Remote Operating Centre','Remote control Centre*','shore control centre','Onshore operation centre'
  ]},
  { id: 'human', label: 'Human dimension', terms: [
    'Human Element*','Human Factor*','Seafarer*','E-farer','non-seafarer*','Crew','Operator*','remote operator*','master*','navigator*','Trust in autonomy','onboard personnel','ship personnel','human oversight','human intervention','mariner*','Human-Machine Interaction','Dynamic human-machine system','Human-Machine teaming','Human-Machine cooperation'
  ]},
  { id: 'competency', label: 'Competencies & Policy', terms: [
    'Competenc*','Skill*','Conceptual Framework*','Framework Develop*','Qualification*','Proficienc*','barrier*','challenge*','obstacle*','Training','Education','Responsibilities','barriers','challenges','Workload','Cognitive Load','Situational Awareness','Decision Making','curriculum development','training programs','guidelines','standards','Regulatory','IMO','Policy','STCW'
  ]}
]

export default function App() {
  const [source, setSource] = useState<'openalex'|'crossref'|'arxiv'>('openalex')
  const [entity, setEntity] = useState<'works'|'authors'>('works')
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState('*')
  const [cursorStack, setCursorStack] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ResultItem[]>([])
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState<string|null>(null)
  const [selectedByCategory, setSelectedByCategory] = useState<Record<string, string[]>>({ technology: [], human: [], competency: [] })

  useEffect(() => {
    setQ('transformers')
    // initial search
    setTimeout(() => doSearch(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function buildQuery(): string {
    const parts: string[] = []
    for (const cat of CATEGORIES) {
      const sel = selectedByCategory[cat.id] || []
      if (sel.length) parts.push(`(${sel.join(' OR ')})`)
    }
    const free = q.trim()
    if (free) parts.push(`(${free})`)
    return parts.join(' AND ')
  }

  async function doSearch(isBack = false) {
    setLoading(true)
    try {
      const query = buildQuery() || q.trim()
      const qs = new URLSearchParams({ source, entity, q: query, per_page: String(10), cursor: String(cursor || '*') })
      const url = `${(API_BASE || '')}/api/search?${qs.toString()}`.replace(/\/+api/, '/api')
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`Backend error ${resp.status}`)
      const data = await resp.json()
      const res = Array.isArray(data.results) ? data.results : []
      setItems(res)
      setTotal(data?.meta?.count || 0)
      setNextCursor(data?.meta?.next_cursor || null)
    } catch (e) {
      setItems([])
      setTotal(0)
      setNextCursor(null)
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCursor('*')
    setCursorStack([])
    doSearch()
  }
  function onPrev() {
    if (!cursorStack.length) return
    const prev = [...cursorStack]
    const last = prev.pop() || '*'
    setCursorStack(prev)
    setCursor(last)
    doSearch(true)
  }
  function onNext() {
    if (!nextCursor) return
    setCursorStack((s) => (cursor ? [...s, cursor] : s))
    setCursor(nextCursor)
    doSearch()
  }

  function toggleTerm(catId: string, term: string, checked: boolean) {
    setSelectedByCategory((old) => {
      const copy = { ...old, [catId]: [...(old[catId] || [])] }
      if (checked) { if (!copy[catId].includes(term)) copy[catId].push(term) }
      else { copy[catId] = copy[catId].filter(t => t !== term) }
      return copy
    })
  }

  return (
    <div className="app-wrap">
      <h1>AI Web Search</h1>
      <form className="app-form" onSubmit={onSubmit}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setCursor('*'); setCursorStack([]) }} placeholder="Search works or authors (e.g., transformers)" />
        <select value={source} onChange={(e) => { const v = e.target.value as any; setSource(v); if (v === 'crossref' || v === 'arxiv') { setEntity('works') } }}>
          <option value="openalex">OpenAlex</option>
          <option value="crossref">Crossref</option>
          <option value="arxiv">arXiv</option>
        </select>
        <select value={entity} onChange={(e) => setEntity(e.target.value as any)} disabled={source === 'crossref' || source === 'arxiv'}>
          <option value="works">Works</option>
          <option value="authors">Authors</option>
        </select>
        <button id="btn-search" type="submit">Search</button>
      </form>

      <div className="keyword-filters" id="keyword-filters">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="card">
            <div className="row"><strong>{cat.label}</strong></div>
            <div className="row keywords">
              {cat.terms.map(t => (
                <label key={t} style={{display:'inline-flex', gap:'.35rem', alignItems:'center', margin:'.15rem .5rem .15rem 0'}}>
                  <input type="checkbox" checked={(selectedByCategory[cat.id]||[]).includes(t)} onChange={(e)=>toggleTerm(cat.id, t, e.target.checked)} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="controls toolbar" aria-live="polite" aria-atomic="true" style={{marginTop:'3rem'}}>
        <button id="prev" type="button" disabled={cursorStack.length===0} onClick={onPrev}>Prev</button>
        <button id="next" type="button" disabled={!nextCursor} onClick={onNext}>Next</button>
        <span id="meta" className="muted">{loading ? 'Loading…' : `${total.toLocaleString()} total – cursor: ${nextCursor ?? '∅'}`}</span>
        <button id="download-json" type="button" disabled={items.length===0} onClick={()=>downloadJson(items, entity, q)}>Download JSON</button>
        <button id="download-csv" type="button" disabled={items.length===0} onClick={()=>downloadCsv(items, entity, q, source)}>Download CSV</button>
      </div>

      <div className="results" id="results">
        {items.length === 0 ? <div className="muted">No results.</div> : (
          entity === 'authors' ? (
            items.map((a:any, idx:number) => (
              <div key={idx} className="card">
                <div className="row"><strong>{safe(a?.display_name || '(no name)')}</strong></div>
                <div className="row muted">Works: {a?.works_count ?? '?'} · Cited by: {a?.cited_by_count ?? '?'}</div>
                <div className="row"><a href={a?.id} target="_blank" rel="noopener">OpenAlex</a></div>
              </div>
            ))
          ) : (
            items.map((w:any, idx:number) => {
              const v = toViewWork(w, source)
              const sourceEngine = source === 'crossref' ? 'Crossref' : (source === 'arxiv' ? 'arXiv' : 'OpenAlex')
              const skills = Array.isArray(v.skills) && v.skills.length ? (<div className="row"><span className="muted">Skills:</span> {safe(v.skills.slice(0,5).join(', '))}</div>) : null
              return (
                <div key={idx} className="card">
                  <div className="row"><strong>{safe(v.title || '(untitled)')}</strong>{v.year ? ` (${v.year})` : ''} {v.open ? <span className="badge badge-oa">OA</span> : null}</div>
                  <div className="row muted">{v.venue ? `${v.venue} · ` : ''}<span className="badge">{sourceEngine}</span></div>
                  {skills}
                  <div className="row">{v.doi ? (<><span className="muted">DOI:</span> <a href={`https://doi.org/${encodeURIComponent(v.doi)}`} target="_blank" rel="noopener">{safe(v.doi)}</a> · </>) : null}<span className="muted">Publisher/Author:</span> {safe(v.publisher_or_author || '')}</div>
                  <div className="row"><a href={v.link} target="_blank" rel="noopener">Link to paper</a></div>
                </div>
              )
            })
          )
        )}
      </div>
    </div>
  )
}

function safe(v:any){ return v==null ? '' : String(v) }
function toCsvRows(rows: string[][]): string { return rows.map(r=>r.map(cell=>{ const s=String(cell); return /[",\n]/.test(s)? '"'+s.replaceAll('"','""')+'"':s }).join(',')).join('\n') }
function firstAuthor(w:any){ const list=Array.isArray(w?.authorships)?w.authorships:[]; return list.length?(list[0].author?.display_name||''):'' }
function downloadBlob(content:string, filename:string, mime:string){ const blob=new Blob([content],{type:mime}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) }
function downloadJson(items:any[], entity:'works'|'authors', query:string){ const ts=new Date().toISOString().replaceAll(':','-'); const filename=`openalex-${entity}-${query||'query'}-${ts}.json`; downloadBlob(JSON.stringify(items,null,2), filename, 'application/json;charset=utf-8') }
function downloadCsv(items:any[], entity:'works'|'authors', query:string, source:string){ if(!items.length) return; const ts=new Date().toISOString().replaceAll(':','-'); const filename=`openalex-${entity}-${query||'query'}-${ts}.csv`; let header:string[]; let rows:string[][]; if(entity==='authors'){ header=['id','display_name','works_count','cited_by_count']; rows=items.map((a:any)=>[safe(a.id),safe(a.display_name),safe(a.works_count),safe(a.cited_by_count)]); } else { header=['query','title','skills','source_engine','doi','publication_year','publisher_or_author','link']; rows=items.map((w:any)=>{ const mapped=mapWorkForExport(w, query, source); return [safe(mapped.query),safe(mapped.title),safe(mapped.skills.join('; ')),safe(mapped.source_engine),safe(mapped.doi),safe(mapped.publication_year),safe(mapped.publisher_or_author),safe(mapped.link)] }); } const csv=toCsvRows([header,...rows]); downloadBlob(csv, filename, 'text/csv;charset=utf-8') }
function mapWorkForExport(w:any, query:string, source='openalex'){ const title=w?.display_name? w.display_name: ''; const concepts=Array.isArray(w?.concepts)? w.concepts: []; const skills=concepts.sort((a:any,b:any)=>(b?.score||0)-(a?.score||0)).slice(0,5).map((c:any)=>c?.display_name||c?.id||'').filter(Boolean); const venueName=(w?.primary_location?.source?.display_name)||(w?.primary_location?.display_name)||(w?.host_venue?.display_name)||''; const publisher=w?.host_venue?.publisher||''; const fa=firstAuthor(w); const publisherOrAuthor=publisher||fa||''; const bestOpen=w?.best_oa_location && (w.best_oa_location.landing_page_url || w.best_oa_location.url); const landing=w?.primary_location?.landing_page_url; const link=bestOpen || landing || (w?.id) || ''; return { query: query||'', title, skills, source_engine: venueName, doi: w?.doi||'', publication_year: w?.publication_year||null, publisher_or_author: publisherOrAuthor, link } }

function toViewWork(w:any, source:'openalex'|'crossref'|'arxiv'){
  if(source==='crossref'){
    const title=Array.isArray(w?.title) && w.title.length ? w.title[0] : (Array.isArray(w?.['container-title']) && w['container-title'][0]) || ''
    const issued=w?.issued && Array.isArray(w.issued['date-parts']) && w.issued['date-parts'][0] ? w.issued['date-parts'][0][0] : undefined
    const venue=Array.isArray(w?.['container-title']) && w['container-title'].length ? w['container-title'][0] : ''
    const link=(Array.isArray(w?.link) && w.link.length && w.link[0].URL) || w?.URL || ''
    const doi=w?.DOI || ''
    const open=(Array.isArray(w?.license) && w.license.length > 0) || (Array.isArray(w?.link) && w.link.length > 0)
    const authors=Array.isArray(w?.author)? w.author: []
    const firstAuthor=authors.length ? (authors[0].family || (authors[0] as any).name || '') : ''
    const publisher=w?.publisher || ''
    const skills=Array.isArray(w?.subject)? w.subject.slice(0,5): []
    return { id:w?.URL || doi || title, title, year:issued, venue, doi, link, open, skills, publisher_or_author: publisher || firstAuthor }
  }
  if(source==='arxiv'){
    const title=w?.title || ''
    const year=w?.year || undefined
    const venue='arXiv'
    const doi=w?.doi || ''
    const link=w?.pdf || w?.link || ''
    const open=true
    const skills=Array.isArray(w?.categories)? w.categories.slice(0,5): []
    const authorOrPublisher=Array.isArray(w?.authors) && w.authors.length? w.authors[0]: ''
    return { id:link || doi || title, title, year, venue, doi, link, open, skills, publisher_or_author: authorOrPublisher }
  }
  const title=w?.display_name || ''
  const year=w?.publication_year || undefined
  const venue=(w?.primary_location?.display_name) || (w?.host_venue?.display_name) || ''
  const link=(w?.best_oa_location?.landing_page_url || w?.best_oa_location?.url) || (w?.primary_location?.landing_page_url) || (w?.id) || ''
  const doi=w?.doi || ''
  const open=Boolean((w?.best_oa_location) || (w?.open_access?.is_oa))
  const skills=Array.isArray(w?.concepts)? [...w.concepts].sort((a:any,b:any)=>(b?.score||0)-(a?.score||0)).slice(0,5).map((c:any)=>c?.display_name||c?.id||'').filter(Boolean): []
  const publisher=w?.host_venue?.publisher || ''
  const fa=firstAuthor(w)
  return { id:w?.id || link || doi || title, title, year, venue, doi, link, open, skills, publisher_or_author: publisher || fa || '' }
}
