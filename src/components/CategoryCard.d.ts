import { FC } from 'react';

interface CategoryCardProps {
  name: string;
  hero: string;
  url?: string;
}

declare const CategoryCard: FC<CategoryCardProps>;
export default CategoryCard; 