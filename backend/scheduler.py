from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
import logging

from backend.database import SessionLocal
from backend.models import AIModel, AuditPolicy
from backend.audit_engine import AuditEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def run_scheduled_audits():
    db = SessionLocal()
    try:
        logger.info("Running scheduled audit check...")
        
        policies = db.query(AuditPolicy).all()
        
        now = datetime.utcnow()
        
        for policy in policies:
            should_run = False
            
            if policy.last_run_at is None:
                should_run = True
            else:
                if policy.audit_frequency == "daily":
                    should_run = (now - policy.last_run_at) >= timedelta(days=1)
                elif policy.audit_frequency == "weekly":
                    should_run = (now - policy.last_run_at) >= timedelta(weeks=1)
                elif policy.audit_frequency == "monthly":
                    should_run = (now - policy.last_run_at) >= timedelta(days=30)
            
            if should_run:
                model = db.query(AIModel).filter(AIModel.id == policy.model_id).first()
                if model:
                    logger.info(f"Running audit for model: {model.name} ({model.model_id})")
                    
                    engine = AuditEngine(db)
                    
                    engine.run_passive_audit(model, policy)
                    
                    if policy.active_audit_enabled:
                        engine.run_active_audit(model, policy)
                    
                    logger.info(f"Audit completed for model: {model.name}")
        
        logger.info("Scheduled audit check completed")
        
    except Exception as e:
        logger.error(f"Error running scheduled audits: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        run_scheduled_audits,
        CronTrigger(hour="*/1"),
        id="audit_check",
        replace_existing=True,
        name="Hourly Audit Check"
    )
    
    scheduler.start()
    logger.info("Audit scheduler started")


def stop_scheduler():
    scheduler.shutdown()
    logger.info("Audit scheduler stopped")
