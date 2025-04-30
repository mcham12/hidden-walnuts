import Head from 'next/head';
import { useEffect, useState } from 'react';
import Logo from '../components/Logo';
import Tagline from '../components/Tagline';
import Announcement from '../components/Announcement';
import CategoryCard from '../components/CategoryCard';
import InstagramFeed from '../components/InstagramFeed';
import SocialLinks from '../components/SocialLinks';
import styles from '../styles/Home.module.css';

type Category = { name: string; hero: string; url: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787";

export default function Home() {
  const defaultCategories: Category[] = [];
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcement, setAnnouncement] = useState('');

  // Load from Cloudflare API on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch categories
        const catRes = await fetch(`${API_BASE}/categories`);
        if (!catRes.ok) {
          console.error('Failed to fetch categories:', await catRes.text());
          return;
        }
        const catData = await catRes.json() as Category[];
        console.log('Fetched categories:', catData);
        setCategories(catData);

        // Fetch announcement
        const annRes = await fetch(`${API_BASE}/announcement`);
        if (!annRes.ok) {
          console.error('Failed to fetch announcement:', await annRes.text());
          return;
        }
        const annData = await annRes.text();
        console.log('Fetched announcement:', annData);
        setAnnouncement(annData === 'null' ? '' : annData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Hidden Walnuts</title>
        <meta name="description" content="Designing Great Things for You" />
      </Head>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
          <Logo />
          <Tagline />
        </div>
        {announcement && (
          <div style={{ margin: '1rem auto', background: '#e5f6ff', color: '#1a2233', borderRadius: 8, padding: '0.75rem 1.5rem', fontWeight: 500, maxWidth: 600, textAlign: 'center' }}>
            {announcement}
          </div>
        )}
      </header>
      <section className={styles.teepublic}>
        <h2>T-shirts, tote bags, and more at our TeePublic store!</h2>
        <div className={styles.categories}>
          {categories.map(cat => (
            <CategoryCard 
              key={cat.name} 
              name={cat.name} 
              hero={cat.hero.includes(API_BASE) ? cat.hero : cat.hero.startsWith('/images/') ? `${API_BASE}${cat.hero}` : cat.hero} 
              url={cat.url} 
            />
          ))}
        </div>
      </section>
      <section className={styles.instagram}>
        <h2>Latest from Instagram</h2>
        <InstagramFeed />
      </section>
      <footer className={styles.footer}>
        <SocialLinks />
      </footer>
    </div>
  );
} 