-- Orchestrator Simulator Database Initialization
-- Creates schemas and base tables

-- Create schemas
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS sim_data;
CREATE SCHEMA IF NOT EXISTS sim_domain;
CREATE SCHEMA IF NOT EXISTS audit;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE SCHEMA - Users, Environments, Scenarios
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Environments table
CREATE TABLE IF NOT EXISTS core.environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    orchestrator_base_url VARCHAR(500),
    worker_base_url VARCHAR(500),
    auth_type VARCHAR(50),
    auth_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenarios table
CREATE TABLE IF NOT EXISTS core.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID REFERENCES core.environments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    tags TEXT[],
    config JSONB DEFAULT '{}',
    created_by UUID REFERENCES core.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SIM_DATA SCHEMA - Chat, Forms, Simulated Data
-- =====================================================

-- Chat sessions
CREATE TABLE IF NOT EXISTS sim_data.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID REFERENCES core.environments(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES core.scenarios(id) ON DELETE SET NULL,
    external_session_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS sim_data.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sim_data.chat_sessions(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    type VARCHAR(50) DEFAULT 'text',
    content TEXT,
    payload JSONB DEFAULT '{}',
    correlation_id VARCHAR(255),
    orchestrator_run_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form definitions
CREATE TABLE IF NOT EXISTS sim_data.form_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID REFERENCES core.environments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    schema JSONB NOT NULL DEFAULT '{}',
    ui_schema JSONB DEFAULT '{}',
    created_by UUID REFERENCES core.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions
CREATE TABLE IF NOT EXISTS sim_data.form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES sim_data.form_definitions(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sim_data.chat_sessions(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'submitted',
    errors JSONB DEFAULT '[]',
    orchestrator_correlation_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SQL tables metadata (for simulated DB)
CREATE TABLE IF NOT EXISTS sim_data.sql_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID REFERENCES core.environments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    schema_definition JSONB NOT NULL,
    seed_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulated API endpoints
CREATE TABLE IF NOT EXISTS sim_data.api_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID REFERENCES core.environments(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES core.scenarios(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    response_template JSONB DEFAULT '{}',
    status_code INTEGER DEFAULT 200,
    latency_ms INTEGER DEFAULT 0,
    error_rate NUMERIC(5,2) DEFAULT 0,
    script TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API call logs
CREATE TABLE IF NOT EXISTS sim_data.api_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID REFERENCES sim_data.api_endpoints(id) ON DELETE CASCADE,
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    latency_ms INTEGER,
    error_injected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (synthetic data)
CREATE TABLE IF NOT EXISTS sim_data.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ts TIMESTAMPTZ DEFAULT NOW(),
    type VARCHAR(50),
    amount NUMERIC(18,2),
    payment_method VARCHAR(50),
    customer_id UUID,
    contract_id UUID,
    status VARCHAR(50),
    channel VARCHAR(50),
    metadata JSONB DEFAULT '{}'
);

-- Operational events
CREATE TABLE IF NOT EXISTS sim_data.operational_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(100),
    ts TIMESTAMPTZ DEFAULT NOW(),
    duration_sec INTEGER,
    agent VARCHAR(100),
    channel VARCHAR(50),
    sla_hit BOOLEAN,
    result VARCHAR(50),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- SIM_DOMAIN SCHEMA - Semantic Domain
-- =====================================================

-- Domain concepts
CREATE TABLE IF NOT EXISTS sim_domain.domain_concepts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(200),
    description TEXT,
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(domain, code)
);

-- Domain relations
CREATE TABLE IF NOT EXISTS sim_domain.domain_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_concept_id UUID REFERENCES sim_domain.domain_concepts(id) ON DELETE CASCADE,
    to_concept_id UUID REFERENCES sim_domain.domain_concepts(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synonyms
CREATE TABLE IF NOT EXISTS sim_domain.synonyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_id UUID REFERENCES sim_domain.domain_concepts(id) ON DELETE CASCADE,
    term VARCHAR(200) NOT NULL,
    language VARCHAR(10) DEFAULT 'pt-BR',
    weight NUMERIC(5,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context templates
CREATE TABLE IF NOT EXISTS sim_domain.context_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUDIT SCHEMA - Observability & Logging
-- =====================================================

-- Orchestrator calls
CREATE TABLE IF NOT EXISTS audit.orchestrator_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID REFERENCES core.environments(id) ON DELETE SET NULL,
    scenario_id UUID REFERENCES core.scenarios(id) ON DELETE SET NULL,
    session_id UUID,
    direction VARCHAR(10) NOT NULL, -- 'outbound' (to orchestrator) or 'inbound' (from orchestrator)
    endpoint VARCHAR(500),
    method VARCHAR(10),
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    latency_ms INTEGER,
    error_flag BOOLEAN DEFAULT false,
    correlation_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executions
CREATE TABLE IF NOT EXISTS audit.executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orchestrator_run_id VARCHAR(255),
    environment_id UUID REFERENCES core.environments(id) ON DELETE SET NULL,
    scenario_id UUID REFERENCES core.scenarios(id) ON DELETE SET NULL,
    session_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    metrics JSONB DEFAULT '{}',
    decision_loop_phases JSONB DEFAULT '{}'
);

-- Audit events
CREATE TABLE IF NOT EXISTS audit.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chat_sessions_environment ON sim_data.chat_sessions(environment_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_scenario ON sim_data.chat_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON sim_data.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON sim_data.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_ts ON sim_data.transactions(ts);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON sim_data.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_operational_events_ts ON sim_data.operational_events(ts);
CREATE INDEX IF NOT EXISTS idx_orchestrator_calls_environment ON audit.orchestrator_calls(environment_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_calls_correlation ON audit.orchestrator_calls(correlation_id);
CREATE INDEX IF NOT EXISTS idx_executions_run_id ON audit.executions(orchestrator_run_id);
CREATE INDEX IF NOT EXISTS idx_domain_concepts_domain ON sim_domain.domain_concepts(domain);

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default admin user (password: admin123)
INSERT INTO core.users (email, password_hash, name, role)
VALUES ('admin@simulator.local', '$2b$10$rICGJKsP8LH3c3V6iKE4Vu2YXyQ9pVz9V1yw4aZx9h.F8qC5qYwDa', 'Administrator', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Insert default DEV environment
INSERT INTO core.environments (name, code, orchestrator_base_url, worker_base_url, auth_type)
VALUES ('Development', 'DEV', 'http://localhost:3000/api/v1/orchestrator', 'http://localhost:3001/api/v1/worker', 'bearer')
ON CONFLICT (code) DO NOTHING;
