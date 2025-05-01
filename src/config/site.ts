export interface Category {
  title: string;
  imageUrl: string;
  url: string;
}

export interface SiteConfig {
  tagline: string;
  announcement: string;
  categories: Category[];
  socialMedia: {
    instagram: string;
    pinterest: string;
    x: string;
  };
}

export const siteConfig: SiteConfig = {
  tagline: "Great Things For You",
  announcement: "New collections coming soon!",
  categories: [
    // {
    //   title: "Fine Art",
    //   imageUrl: "/hero-celebrating-fine-art.png",
    //   url: "/fine-art"
    // },
    // {
    //   title: "Poetry",
    //   imageUrl: "/hero-poetry.png",
    //   url: "/poetry"
    // },
  ],
  socialMedia: {
    instagram: "https://instagram.com/hiddenwalnuts",
    pinterest: "https://pinterest.com/hiddenwalnuts",
    x: "https://x.com/hiddenwalnuts"
  }
}; 