import 'dotenv/config';
import { hash } from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const email = process.argv[2] ?? 'jb@gmail.com';
const password = process.argv[3] ?? '123456789@';
const prenom = process.argv[4] ?? 'Jean';
const nom = process.argv[5] ?? 'Baptiste';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await hash(password, 12);

  const existing = await prisma.auth.findUnique({ where: { email } });

  if (existing) {
    await prisma.auth.update({
      where: { email },
      data: {
        mot_de_passe_hash: passwordHash,
        role: 'ADMIN',
        statut: 'ACTIF',
        email_verified: true,
        auth_provider: 'LOCAL',
      },
    });
    console.log(`Compte mis à jour : ${email} (ADMIN, ACTIF)`);
  } else {
    const personne = await prisma.personne.create({
      data: { prenom, nom, points: 0 },
    });
    await prisma.auth.create({
      data: {
        personne_id: personne.id,
        email,
        mot_de_passe_hash: passwordHash,
        role: 'ADMIN',
        statut: 'ACTIF',
        email_verified: true,
        auth_provider: 'LOCAL',
      },
    });
    console.log(`Compte créé : ${email} (ADMIN, ACTIF)`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
