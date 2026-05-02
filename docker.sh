#!/bin/bash
set -e

echo "🐳 MD Tree Docker Management Script"
echo ""

case "$1" in
  build)
    echo "Building Docker image..."
    docker-compose build
    ;;
  start)
    echo "Starting container..."
    docker-compose up -d
    docker-compose ps
    ;;
  stop)
    echo "Stopping container..."
    docker-compose stop
    ;;
  restart)
    echo "Restarting container..."
    docker-compose restart
    docker-compose ps
    ;;
  logs)
    echo "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f
    ;;
  status)
    docker-compose ps
    ;;
  shell)
    echo "Opening shell in container..."
    docker-compose exec md-tree /bin/sh
    ;;
  backup)
    BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sqlite"
    echo "Creating backup: $BACKUP_FILE"
    docker-compose exec -T md-tree sqlite3 /app/data/data.sqlite ".backup /tmp/backup.sqlite"
    docker cp $(docker-compose ps -q md-tree):/tmp/backup.sqlite ./data/$BACKUP_FILE
    echo "Backup saved to: ./data/$BACKUP_FILE"
    ;;
  restore)
    if [ -z "$2" ]; then
      echo "Usage: $0 restore <backup-file>"
      exit 1
    fi
    echo "Restoring from: $2"
    docker-compose stop
    cp "$2" ./data/data.sqlite
    docker-compose start
    echo "Database restored"
    ;;
  clean)
    echo "⚠️  This will remove all data! Are you sure? (yes/no)"
    read -r response
    if [ "$response" = "yes" ]; then
      docker-compose down -v
      rm -rf ./data/*
      echo "All data removed"
    else
      echo "Cancelled"
    fi
    ;;
  *)
    echo "Usage: $0 {build|start|stop|restart|logs|status|shell|backup|restore|clean}"
    echo ""
    echo "Commands:"
    echo "  build    - Build Docker image"
    echo "  start    - Start container"
    echo "  stop     - Stop container"
    echo "  restart  - Restart container"
    echo "  logs     - Show container logs"
    echo "  status   - Show container status"
    echo "  shell    - Open shell in container"
    echo "  backup   - Create database backup"
    echo "  restore  - Restore database from backup"
    echo "  clean    - Remove all data (destructive!)"
    exit 1
    ;;
esac
