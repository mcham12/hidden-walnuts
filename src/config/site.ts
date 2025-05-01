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
  tagline: "Discover the Extraordinary in the Everyday",
  announcement: "New collection coming soon!",
  categories: [
    {
      title: "Fine Art",
      imageUrl: "/placeholder-fineart.jpg",
      url: "/fine-art"
    },
    {
      title: "Poetry",
      imageUrl: "/placeholder-poetry.jpg",
      url: "/poetry"
    },
    {
      title: "Nature",
      imageUrl: "/placeholder-nature.jpg",
      url: "/nature"
    }
  ],
  socialMedia: {
    instagram: "https://instagram.com/hiddenwalnuts",
    pinterest: "https://pinterest.com/hiddenwalnuts",
    x: "https://x.com/hiddenwalnuts"
  }
}; 