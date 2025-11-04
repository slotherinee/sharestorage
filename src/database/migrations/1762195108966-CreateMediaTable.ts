import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMediaTable1762195108966 implements MigrationInterface {
  name = 'CreateMediaTable1762195108966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "storageKey" character varying(255) NOT NULL, "originalFileName" character varying(255) NOT NULL, "mimeType" character varying(128) NOT NULL, "size" bigint NOT NULL, "isPublic" boolean NOT NULL DEFAULT false, "title" character varying(160), "status" character varying(32) NOT NULL DEFAULT 'uploaded', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD CONSTRAINT "FK_c6889397830b5ed0f2a30362065" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media" DROP CONSTRAINT "FK_c6889397830b5ed0f2a30362065"`,
    );
    await queryRunner.query(`DROP TABLE "media"`);
  }
}
