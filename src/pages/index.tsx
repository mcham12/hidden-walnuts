import { siteConfig } from '@/config/site';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaPinterest, FaTwitter } from 'react-icons/fa';
import PlaceholderImage from '@/components/PlaceholderImage';

export default function Home() {
  const { tagline, announcement, categories, socialMedia } = siteConfig;

  return (
    <>
      <Head>
        <title>Hidden Walnuts</title>
        <meta name="description" content={tagline} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        {/* Header */}
        <header className="py-16">
          <div className="container flex flex-col items-center">
            <div className="relative w-48 h-24 mb-8">
              <Image
                src="/logo-green.png"
                alt="Hidden Walnuts Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4 text-center max-w-2xl">
              {tagline}
            </h1>
            {announcement && (
              <p className="text-lg text-gray-600 italic text-center max-w-xl">
                {announcement}
              </p>
            )}
          </div>
        </header>

        {/* Categories */}
        <section className="py-16">
          <div className={`container grid ${
            categories.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
            categories.length === 2 ? 'grid-cols-1 md:grid-cols-2 gap-8' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
          }`}>
            {categories.map((category) => (
              <Link
                key={category.title}
                href={category.url}
                className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <PlaceholderImage
                  src={category.imageUrl}
                  alt={category.title}
                  className="group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/40 group-hover:from-black/60 group-hover:to-black/30 transition-all duration-300">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h2 className="text-3xl font-serif text-white text-center px-4">
                      {category.title}
                    </h2>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Social Media */}
        <footer className="py-12 bg-white">
          <div className="container">
            <div className="flex justify-center space-x-8">
              <a
                href={socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-300"
                aria-label="Instagram"
              >
                <FaInstagram size={28} />
              </a>
              <a
                href={socialMedia.pinterest}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-300"
                aria-label="Pinterest"
              >
                <FaPinterest size={28} />
              </a>
              <a
                href={socialMedia.x}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-600 transition-colors duration-300"
                aria-label="Twitter"
              >
                <FaTwitter size={28} />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
} 