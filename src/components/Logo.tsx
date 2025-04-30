import Image from 'next/image';

export default function Logo() {
  // Try green logo first, fallback to generic logo
  const logos = [
    '/logo-green.png',
    '/logo.png',
    '/logo.svg',
  ];
  return (
    <div style={{ textAlign: 'center', margin: '1rem 0', animation: 'float 3s ease-in-out infinite' }}>
      <Image src={logos[0]} alt="Hidden Walnuts Logo" width={120} height={120} priority onError={(e) => { (e.target as HTMLImageElement).src = logos[1]; }} />
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 