#!/bin/sh
set -e

echo ">> Démarrage NestJS en production..."
exec node dist/src/main
