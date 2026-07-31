import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { PlanType, StatutPlan } from '../generated/prisma/enums';
import { seedCatalog } from './seed-catalog';
import { seedChallenges } from './seed-challenges';
import { seedUserData } from './seed-user-data';

/** Tarifs alignés marché Congo (valeurs stockées en XAF). */
const PLANS = [
  { plan: PlanType.HEBDOMADAIRE, prix: 1500, duree_jours: 7 },
  { plan: PlanType.MENSUEL, prix: 4900, duree_jours: 30 },
  { plan: PlanType.ANNUEL, prix: 39900, duree_jours: 365 },
] as const;

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  console.log('═══ BiblioTech — Seed complet (hors auth) ═══\n');

  for (const item of PLANS) {
    await prisma.planAbonnement.upsert({
      where: { plan: item.plan },
      create: {
        plan: item.plan,
        prix: item.prix,
        duree_jours: item.duree_jours,
        devise: 'XAF',
        statut: StatutPlan.ACTIF,
      },
      update: {
        prix: item.prix,
        duree_jours: item.duree_jours,
        devise: 'XAF',
        statut: StatutPlan.ACTIF,
      },
    });
  }
  console.log('✓ planAbonnement : 3 plans (HEBDO / MENSUEL / ANNUEL) — max. imposé par le schéma');

  const catalog = await seedCatalog(prisma);
  console.log('✓ Catalogue :');
  console.log(`    personne: ${catalog.personnes} (sans compte auth)`);
  console.log(`    categorie: ${catalog.categories}`);
  console.log(`    auteur: ${catalog.auteurs}`);
  console.log(`    bibliotheque: ${catalog.bibliotheques}`);
  console.log(`    livre: ${catalog.livres}`);
  console.log(`    appartenir: ${catalog.appartenir}`);
  console.log(`    appartient: ${catalog.appartient}`);
  console.log(`    LivreAuteur: ${catalog.livreAuteur}`);
  console.log(`    StatistiqueLivre: ${catalog.statistiques}`);

  const challenges = await seedChallenges(prisma);
  console.log('✓ Gamification :');
  console.log(`    badge: ${challenges.badges}`);
  console.log(`    defi: ${challenges.defis} (${challenges.defisActifsListe} actifs)`);

  const userData = await seedUserData(prisma, { livreIds: catalog.livreIds });
  console.log('✓ Données liées aux comptes existants (auth non créé par le seed) :');
  if (userData.skipped) {
    console.log(`    ⚠ ${userData.reason}`);
  } else {
    console.log(`    comptes auth utilisés: ${userData.authUtilises}`);
    for (const [table, count] of Object.entries(userData.counts)) {
      console.log(`    ${table}: ${count}`);
    }
  }

  console.log('\n── Tables exclues (authentification) ──');
  console.log('    auth, otp, token_lecture — non peuplées par ce seed.');
  console.log('\n── Pour tester les endpoints /me ──');
  if (challenges.userBadgePourCompteTest) {
    console.log(`    Compte ${challenges.emailCompteTest} : badge + données user OK.`);
  } else {
    console.log(
      `    Créez ${challenges.emailCompteTest} via Auth, puis relancez : npm run db:seed`,
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
