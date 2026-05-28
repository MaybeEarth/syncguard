import { SyncStatus } from './types';

export class SyncGuardUI {
  private container: HTMLDivElement | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.initUI();
    }
  }

  private initUI() {
    const styleId = 'syncguard-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .syncguard-toast {
          position: fixed;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-in-out;
          z-index: 999999;
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          pointer-events: none;
        }
        .syncguard-toast.visible {
          top: 20px;
          opacity: 1;
        }
        .syncguard-toast.offline {
          background: linear-gradient(135deg, #f03e3e, #d9480f);
        }
        .syncguard-toast.syncing {
          background: linear-gradient(135deg, #1c7ed6, #0b7285);
        }
        .syncguard-toast.success {
          background: linear-gradient(135deg, #2f9e44, #2b8a3e);
        }
        .syncguard-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: syncguard-spin 1s linear infinite;
        }
        @keyframes syncguard-spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    this.container = document.createElement('div');
    this.container.className = 'syncguard-toast';
    document.body.appendChild(this.container);
  }

  public showOffline() {
    if (!this.container) return;
    this.container.className = 'syncguard-toast offline visible';
    this.container.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      <span>Çevrimdışısınız. Değişiklikleriniz yerel olarak kaydediliyor...</span>
    `;
  }

  public showSyncing(current: number, total: number) {
    if (!this.container) return;
    this.container.className = 'syncguard-toast syncing visible';
    this.container.innerHTML = `
      <div class="syncguard-spinner"></div>
      <span>Veriler senkronize ediliyor (%${current}/${total})...</span>
    `;
  }

  public showSuccess() {
    if (!this.container) return;
    this.container.className = 'syncguard-toast success visible';
    this.container.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <span>Senkronizasyon tamamlandı, verileriniz güncel!</span>
    `;

    setTimeout(() => {
      this.hide();
    }, 3000);
  }

  public hide() {
    if (!this.container) return;
    this.container.classList.remove('visible');
  }

  public destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}
