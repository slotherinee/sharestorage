import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { User } from '../users/user.entity';
import { MediaStatus } from './enums/media-status.enum';

const numberTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity({ name: 'media' })
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, (user) => user.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @Column({ length: 255 })
  storageKey: string;

  @Column({ length: 255 })
  originalFileName: string;

  @Column({ length: 128 })
  mimeType: string;

  @Column({ type: 'bigint', transformer: numberTransformer })
  size: number;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 32, default: MediaStatus.Uploaded })
  status: MediaStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
