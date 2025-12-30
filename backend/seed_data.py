from datetime import datetime
from sqlalchemy.orm import Session

from backend.database import SessionLocal, init_db
from backend.models import AIModel, AuditPolicy, EvidenceSource
from backend.audit_engine import AuditEngine


def seed_database():
    init_db()
    
    db = SessionLocal()
    
    try:
        existing = db.query(AIModel).first()
        if existing:
            print("Database already seeded, skipping...")
            return
        
        models_data = [
            {"model_id": "gpt-4-prod", "name": "GPT-4 Production", "version": "1.0", "model_type": "llm", "connection_type": "api"},
            {"model_id": "claude-enterprise", "name": "Claude Enterprise", "version": "2.1", "model_type": "llm", "connection_type": "api"},
            {"model_id": "custom-llm-v2", "name": "Custom LLM v2", "version": "2.0", "model_type": "llm", "connection_type": "logs"},
            {"model_id": "gemini-pro", "name": "Gemini Pro", "version": "1.5", "model_type": "llm", "connection_type": "api"},
            {"model_id": "mistral-7b", "name": "Mistral 7B", "version": "0.2", "model_type": "llm", "connection_type": "batch"},
            {"model_id": "fraud-detector", "name": "Fraud Detection Model", "version": "3.1", "model_type": "ml", "connection_type": "batch"},
            {"model_id": "sentiment-analyzer", "name": "Sentiment Analyzer", "version": "1.2", "model_type": "ml", "connection_type": "api"},
            {"model_id": "recommendation-engine", "name": "Recommendation Engine", "version": "2.0", "model_type": "ml", "connection_type": "logs"},
        ]
        
        for model_data in models_data:
            model = AIModel(
                model_id=model_data["model_id"],
                name=model_data["name"],
                version=model_data["version"],
                model_type=model_data["model_type"],
                connection_type=model_data["connection_type"],
                created_at=datetime.utcnow()
            )
            db.add(model)
            db.flush()
            
            policy = AuditPolicy(
                model_id=model.id,
                audit_frequency="daily",
                baseline_strategy="previous_audit",
                audit_scope={"drift": True, "bias": True, "risk": True, "compliance": True, "active_security": False},
                active_audit_enabled=model_data["model_id"] in ["gpt-4-prod", "claude-enterprise"]
            )
            db.add(policy)
            
            evidence = EvidenceSource(
                model_id=model.id,
                source_type=model_data["connection_type"],
                config={"endpoint": f"https://api.example.com/{model_data['model_id']}"},
                read_only=True
            )
            db.add(evidence)
        
        db.commit()
        print(f"Seeded {len(models_data)} models")
        
        engine = AuditEngine(db)
        
        for model_data in models_data:
            model = db.query(AIModel).filter(AIModel.model_id == model_data["model_id"]).first()
            policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
            
            if model and policy:
                print(f"Running initial audit for {model.name}...")
                engine.run_passive_audit(model, policy)
                
                if policy.active_audit_enabled:
                    engine.run_active_audit(model, policy)
        
        print("Initial audits completed")
        
        for model_data in models_data[:4]:
            model = db.query(AIModel).filter(AIModel.model_id == model_data["model_id"]).first()
            policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
            
            if model and policy:
                print(f"Running second audit for {model.name}...")
                engine.run_passive_audit(model, policy)
        
        print("Seed data created successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
