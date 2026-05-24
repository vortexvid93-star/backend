#!/bin/sh
set -e

echo ">> Synchronisation base de données (migrations + contraintes)..."
npm run db:sync

echo ">> Démarrage NestJS en production..."
exec node dist/src/main
