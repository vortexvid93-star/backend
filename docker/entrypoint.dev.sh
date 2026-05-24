#!/bin/sh
set -e

echo ">> Synchronisation base de données (migrations + contraintes)..."
npm run db:sync

echo ">> Démarrage NestJS en mode développement..."
exec npm run start:dev
