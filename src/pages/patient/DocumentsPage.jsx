// ── Documents Page (Patient View) ──
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import missionService from '../../services/missionService';
import documentService from '../../services/documentService';
import { ArrowLeft, Folder, FileText, Download, Eye, ExternalLink, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

export default function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const missions = await missionService.getByPatient(user.id);
        const docsList = [];
        
        missions.forEach(m => {
          if (Array.isArray(m.documents)) {
            m.documents.forEach(doc => {
              docsList.push({
                ...doc,
                missionId: m.id,
                missionDate: m.scheduledDate,
                missionType: m.careType,
                proName: m.assignedProName || 'Cabinet Moreau'
              });
            });
          }
        });
        
        // Sort documents by date (latest first)
        docsList.sort((a, b) => b.missionDate?.localeCompare(a.missionDate));
        setDocuments(docsList);
      } catch (err) {
        console.error("Error loading documents:", err);
        showToast("Impossible de charger vos documents", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleView = async (doc) => {
    try {
      const url = await documentService.getSecureUrl(doc);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        showToast("Impossible de charger l'aperçu du document", "error");
      }
    } catch (err) {
      showToast("Erreur lors de l'ouverture", "error");
    }
  };

  return (
    <div className="page-container animate-fadeIn" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 40px)', background: '#F8FAFC' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #F1F5F9', marginBottom: '20px' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          Mes documents de santé
        </h1>
        <div style={{ width: '40px' }} /> {/* Balance spacer */}
      </div>

      {/* ── Info alert card ── */}
      <div className="glass-card" style={{
        padding: '16px',
        borderRadius: '16px',
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', flexShrink: 0
        }}>
          <Folder size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A', margin: '0 0 2px 0' }}>Coffre-fort médical</h4>
          <p style={{ fontSize: '11px', color: '#1D4ED8', lineHeight: '1.4', margin: 0, fontWeight: 500 }}>
            Retrouvez ici toutes vos ordonnances, prescriptions et justificatifs médicaux rattachés à vos demandes de soins.
          </p>
        </div>
      </div>

      {/* ── Documents list ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', padding: '48px 16px', border: '1px solid var(--border-color)', borderRadius: '24px', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ background: 'rgba(37, 99, 235, 0.05)', color: 'var(--color-primary)', width: '64px', height: '64px', margin: '0 auto 16px auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={28} />
          </div>
          <h3 className="empty-state-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>Aucun document de santé</h3>
          <p className="empty-state-text" style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto', lineHeight: '1.5' }}>
            Vous n'avez pas encore téléversé d'ordonnance ou de prescription. Celles-ci apparaîtront ici dès que vous les rattacherez à une demande.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {documents.map((doc, idx) => (
            <div 
              key={doc.id || idx}
              style={{
                background: 'white',
                border: '1px solid #F1F5F9',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              {/* Document icon visual */}
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                flexShrink: 0
              }}>
                <FileText size={20} />
              </div>

              {/* Title and details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {doc.name || 'Ordonnance médicale'}
                </h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Calendar size={11} />
                    {doc.missionDate ? formatDate(doc.missionDate) : 'Date inconnue'}
                  </span>
                  <span>•</span>
                  <span>{doc.proName}</span>
                </div>
              </div>

              {/* View action button */}
              <button 
                onClick={() => handleView(doc)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#F0F5FF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.2s ease'
                }}
                title="Voir le document"
              >
                <Eye size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
