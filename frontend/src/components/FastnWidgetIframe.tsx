import { useRef, useEffect } from 'react';

interface FastnWidgetProps {
  projectId: string;
  authToken: string;
  tenantId: string;
  apiKey?: string;
  theme?: 'light' | 'dark';
  env?: string;
  style?: React.CSSProperties;
}

export function FastnWidgetIframe({
  projectId,
  authToken,
  tenantId,
  apiKey = '',
  theme = 'light',
  env = 'LIVE',
  style = { minHeight: '800px' }
}: FastnWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetDomain = 'https://live.fastn.ai/widget';

  const origin = encodeURIComponent(window.location.origin);
  const path = encodeURIComponent(window.location.pathname + window.location.search);
  const customAuth = true;

  const iframeSrc = `${widgetDomain}?origin=${origin}&path=${path}&customAuth=${customAuth}&projectId=${projectId}&tenantId=${tenantId}&theme=${theme}&apiKey=${apiKey}&env=${env}`;

  useEffect(() => {
    const handleIframeLoad = () => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          eventType: 'update_fastn_auth_token',
          authToken: authToken,
        },
        widgetDomain
      );
    };

    const iframe = iframeRef.current;
    iframe?.addEventListener('load', handleIframeLoad);

    return () => {
      iframe?.removeEventListener('load', handleIframeLoad);
    };
  }, [authToken, widgetDomain]);

  useEffect(() => {
    if (authToken && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          eventType: 'update_fastn_auth_token',
          authToken: authToken,
        },
        widgetDomain
      );
    }
  }, [authToken, widgetDomain]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.eventType === 'update_fastn_iframe_height') {
        const iframe = iframeRef.current;
        const height = event.data.height;
        if (iframe && height) {
          iframe.style.height = `${height}px`;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      title="Fastn Widget"
      width="100%"
      style={style}
    />
  );
}
