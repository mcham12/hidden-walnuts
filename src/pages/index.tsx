import { siteConfig } from '@/config/site';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaPinterest, FaXTwitter } from 'react-icons/fa6';
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
          <div className="container flex flex-row items-center justify-center gap-8">
            <div className="relative w-48 h-24 flex-shrink-0">
              <Image
                src="/logo-green.png"
                alt="Hidden Walnuts Logo"
                fill
                sizes="192px"
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">
                {tagline}
              </h1>
              {announcement && (
                <p className="text-lg text-gray-600 italic">
                  {announcement}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Categories */}
        <section className="py-16">
          <div className={`container grid ${
            categories.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
            categories.length === 2 ? 'grid-cols-1 md:grid-cols-2 gap-8' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
          }`}>
            {categories.map((category) => (
              <Link
                key={category.title}
                href={category.url}
                className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 h-96"
              >
                <PlaceholderImage
                  src={category.imageUrl}
                  alt={category.title}
                  className="h-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent group-hover:from-black/60 group-hover:to-transparent/30 transition-all duration-300">
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h2 className="text-3xl font-serif text-white">
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
                aria-label="X"
              >
                <FaXTwitter size={28} />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
} 