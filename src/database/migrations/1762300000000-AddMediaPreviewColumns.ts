import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaPreviewColumns1762300000000 implements MigrationInterface {
  name = 'AddMediaPreviewColumns1762300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "media" ADD "metadata" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "media" ADD "previewStorageKey" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "previewContentType" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media" DROP COLUMN "previewContentType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" DROP COLUMN "previewStorageKey"`,
    );
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "metadata"`);
  }
}
