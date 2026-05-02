#!/usr/bin/env node
/**
 * Database Cleanup Script
 * Removes old sessions and orphaned pastes
 * Run via cron: node cleanup.js
 */

import db from "./db.js";

const DAYS_TO_KEEP = 30;

const cleanup = () => {
  console.log(`[Cleanup] Starting database cleanup (keeping last ${DAYS_TO_KEEP} days)...`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
  const cutoff = cutoffDate.toISOString();
  
  try {
    // Delete old sessions
    const sessionsDeleted = db.prepare(
      "DELETE FROM sessions WHERE last_seen < ?"
    ).run(cutoff);
    console.log(`[Cleanup] Removed ${sessionsDeleted.changes} old sessions`);
    
    // Delete pastes from deleted sessions (orphaned pastes)
    const orphanedDeleted = db.prepare(
      `DELETE FROM pastes 
       WHERE session_id NOT IN (SELECT id FROM sessions)
       AND shared = 0`
    ).run();
    console.log(`[Cleanup] Removed ${orphanedDeleted.changes} orphaned pastes`);
    
    // Optimize database
    db.prepare("VACUUM").run();
    console.log("[Cleanup] Database optimized (VACUUM)");
    
    // Show stats
    const sessionCount = db.prepare("SELECT COUNT(*) as cnt FROM sessions").get();
    const pasteCount = db.prepare("SELECT COUNT(*) as cnt FROM pastes").get();
    console.log(`[Cleanup] Current stats: ${sessionCount.cnt} sessions, ${pasteCount.cnt} pastes`);
    
    console.log("[Cleanup] Done!");
  } catch (error) {
    console.error("[Cleanup] Error:", error);
    process.exit(1);
  }
};

cleanup();
