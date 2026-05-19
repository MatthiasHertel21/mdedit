#!/usr/bin/env bash

set -euo pipefail

echo "== Host =="
hostname
date -Is

echo
echo "== Memory =="
free -h

echo
echo "== Swap =="
swapon --show || true

echo
echo "== Docker containers =="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.RunningFor}}'

echo
echo "== Docker resource guardrails =="
docker ps --format '{{.Names}}' | while read -r name; do
  docker inspect --format '{{.Name}} {{.HostConfig.Memory}} {{.HostConfig.MemoryReservation}} {{.HostConfig.PidsLimit}}' "$name"
done | awk '
  {
    name=$1; memory=$2; reservation=$3; pids=$4;
    if (memory == 0 || memory == "0" || pids == "<nil>") {
      print name " memory=" memory " reservation=" reservation " pids=" pids;
    }
  }
'

echo
echo "== Top Docker memory users =="
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}'

echo
echo "== fail2ban sshd =="
if command -v fail2ban-client >/dev/null 2>&1; then
  if sudo -n fail2ban-client status sshd; then
    :
  else
    echo 'fail2ban installed, but sudo without prompt is unavailable for this shell.'
  fi
else
  echo 'fail2ban-client not installed.'
fi

echo
echo "== SSH effective config =="
if sudo -n sshd -T >/dev/null 2>&1; then
  sudo -n sshd -T | egrep 'passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|permitrootlogin|maxauthtries|logingracetime|maxstartups'
else
  echo 'sudo without prompt is unavailable for sshd -T.'
fi