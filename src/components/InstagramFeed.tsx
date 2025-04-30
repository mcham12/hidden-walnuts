import { useEffect } from 'react';

export default function InstagramFeed() {
  useEffect(() => {
    // Load LightWidget script
    const script = document.createElement('script');
    script.src = 'https://cdn.lightwidget.com/widgets/lightwidget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on component unmount
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>
      <iframe 
        src="//lightwidget.com/widgets/2f0a30297ab9527bb527323349571ae1.html"
        scrolling="no"
        className="lightwidget-widget"
        style={{ 
          width: '800px',
          height: '400px',
          border: 0,
          overflow: 'hidden',
          borderRadius: '0.75rem',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
} 