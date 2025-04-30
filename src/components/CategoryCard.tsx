import styles from '../styles/CategoryCard.module.css';

interface CategoryCardProps {
  name: string;
  hero: string;
  url: string;
}

export default function CategoryCard({ name, hero, url }: CategoryCardProps) {
  // Convert relative URLs to absolute URLs if needed
  const imageUrl = hero.startsWith('http') ? hero : `${process.env.NEXT_PUBLIC_API_BASE}${hero}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div className={styles.card}>
        <div style={{ position: 'relative', width: '100%', height: 200, background: '#f3f4f6', overflow: 'hidden' }}>
          <img
            src={imageUrl}
            alt={name}
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
        <div style={{ padding: '1rem' }}>
          <h3 style={{ margin: 0, color: '#1a2233', fontSize: '1.25rem', fontWeight: 600 }}>{name}</h3>
        </div>
      </div>
    </a>
  );
} 