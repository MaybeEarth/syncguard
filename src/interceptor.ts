import { SyncGuard } from './index';

export class FetchInterceptor {
  private originalFetch: typeof window.fetch | null = null;
  private originalXHR: typeof window.XMLHttpRequest | null = null;
  private isActive = false;

  constructor(private syncGuard: SyncGuard) {}

  public enable() {
    if (this.isActive || typeof window === 'undefined') return;

    // Intercept Fetch
    if (window.fetch) {
      this.originalFetch = window.fetch;
      const self = this;

      window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
        
        // Execute through SyncGuard
        const response = await self.syncGuard.executeRequest(url, init);
        
        if (response) {
          return response;
        } else {
          // If executeRequest returns void (meaning it was queued because we are offline)
          // We return a mock accepted Response to prevent the app from throwing errors
          // This enables Optimistic UI
          return new Response(
            JSON.stringify({ status: 'queued', message: 'Request queued by SyncGuard' }),
            {
              status: 202,
              statusText: 'Accepted (Queued Offline)',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      };
    }

    // Intercept XMLHttpRequest (XHR) for older libraries (like Axios fallback)
    if (window.XMLHttpRequest) {
        this.originalXHR = window.XMLHttpRequest;
        const self = this;

        // Simple monkey patch for XHR is complex. For zero-dependency we will do a basic wrapper.
        // In a real robust implementation, one might use a library like 'xhr-mock' or similar, 
        // but since we are zero dependency, we will intercept open and send.
        class MockXHR extends XMLHttpRequest {
            private _url: string = '';
            private _method: string = '';
            private _headers: Record<string, string> = {};
            private _body: any = null;

            open(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
                this._method = method;
                this._url = url.toString();
                super.open(method, url, async, username, password);
            }

            setRequestHeader(name: string, value: string) {
                this._headers[name] = value;
                super.setRequestHeader(name, value);
            }

            send(body?: Document | XMLHttpRequestBodyInit | null) {
                this._body = body;
                
                if (!self.syncGuard.isCurrentlyOnline) {
                    // It's offline, intercept it
                    self.syncGuard.executeRequest(this._url, {
                        method: this._method,
                        headers: this._headers,
                        body: this._body
                    });

                    // Simulate success for optimistic UI
                    Object.defineProperty(this, 'readyState', { value: 4 });
                    Object.defineProperty(this, 'status', { value: 202 });
                    Object.defineProperty(this, 'statusText', { value: 'Accepted (Queued Offline)' });
                    Object.defineProperty(this, 'responseText', { value: '{"status":"queued"}' });
                    Object.defineProperty(this, 'response', { value: '{"status":"queued"}' });
                    
                    if (this.onreadystatechange) {
                        this.onreadystatechange(new Event('readystatechange'));
                    }
                    if (this.onload) {
                        this.onload(new ProgressEvent('load'));
                    }
                } else {
                    super.send(body);
                }
            }
        }
        (window as any).XMLHttpRequest = MockXHR;
    }

    this.isActive = true;
  }

  public disable() {
    if (!this.isActive || typeof window === 'undefined') return;
    
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    
    if (this.originalXHR) {
        window.XMLHttpRequest = this.originalXHR;
    }

    this.isActive = false;
  }
}
