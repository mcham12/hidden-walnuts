const socials = [
  { name: 'Pinterest', url: 'https://pinterest.com/HiddenWalnuts', handle: 'HiddenWalnuts', icon: '📌' },
  { name: 'Instagram', url: 'https://instagram.com/hiddenwalnuts', handle: 'hiddenwalnuts', icon: '📸' },
  { name: 'X', url: 'https://x.com/HiddenWalnuts', handle: 'HiddenWalnuts', icon: '❌' },
];

export default function SocialLinks() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '2rem 0' }}>
      {socials.map(s => (
        <a
          key={s.name}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#228B22', fontWeight: 600, textDecoration: 'none', fontSize: '1.2rem' }}
        >
          <span style={{ fontSize: '1.5rem', marginRight: 6 }}>{s.icon}</span>
          {s.handle}
        </a>
      ))}
    </div>
  );
} 