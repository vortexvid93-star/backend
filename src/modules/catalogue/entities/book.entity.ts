import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { SubCategory } from './sub-category.entity';
import { Review } from '../../reviews/entities/review.entity';
import { ReadingProgress } from '../../users/entities/reading-progress.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  author!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'cover_url', nullable: true })
  coverUrl!: string | null;

  @Column({ name: 'file_url', nullable: true })
  fileUrl!: string | null;

  @Column({ nullable: true, unique: true })
  isbn!: string | null;

  @Column({ default: 'fr' })
  language!: string;

  @Column({ name: 'is_digital', default: true })
  isDigital!: boolean;

  @Column({ name: 'stock_count', type: 'int', default: 0 })
  stockCount!: number;

  @Column({ name: 'published_year', type: 'int', nullable: true })
  publishedYear!: number | null;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 2,
    scale: 1,
    default: 0,
  })
  averageRating!: string;

  @Column({ name: 'total_reviews', type: 'int', default: 0 })
  totalReviews!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Category, (c) => c.books, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => SubCategory, (s) => s.books, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sub_category_id' })
  subCategory!: SubCategory | null;

  @Column({ name: 'sub_category_id', nullable: true })
  subCategoryId!: string | null;

  @OneToMany(() => Review, (r) => r.book)
  reviews!: Review[];

  @OneToMany(() => ReadingProgress, (rp) => rp.book)
  readingProgress!: ReadingProgress[];
}
