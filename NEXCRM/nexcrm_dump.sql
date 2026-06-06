--
-- PostgreSQL database dump
--

\restrict pYhLYskjIWr5H4xdbbrrbIH1uoVo1gOWl38io42dtiynrkB82wv27awrHQhVFZs

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_leads_lead_type; Type: TYPE; Schema: public; Owner: nexcrm
--

CREATE TYPE public.enum_leads_lead_type AS ENUM (
    'COLD',
    'WARM',
    'HOT',
    'STALE',
    'CONVERTED',
    'LOST'
);


ALTER TYPE public.enum_leads_lead_type OWNER TO nexcrm;

--
-- Name: enum_leads_status; Type: TYPE; Schema: public; Owner: nexcrm
--

CREATE TYPE public.enum_leads_status AS ENUM (
    'NEW',
    'ACTIVE',
    'ENGAGED',
    'MEETING_SCHEDULED',
    'PROPOSAL_SENT',
    'NEGOTIATION',
    'CONVERTED',
    'LOST',
    'OPTED_OUT',
    'STALE'
);


ALTER TYPE public.enum_leads_status OWNER TO nexcrm;

--
-- Name: enum_outreach_records_status; Type: TYPE; Schema: public; Owner: nexcrm
--

CREATE TYPE public.enum_outreach_records_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'failed',
    'bounced'
);


ALTER TYPE public.enum_outreach_records_status OWNER TO nexcrm;

--
-- Name: enum_sequence_enrollments_status; Type: TYPE; Schema: public; Owner: nexcrm
--

CREATE TYPE public.enum_sequence_enrollments_status AS ENUM (
    'active',
    'paused',
    'completed',
    'exited'
);


ALTER TYPE public.enum_sequence_enrollments_status OWNER TO nexcrm;

--
-- Name: enum_sequences_status; Type: TYPE; Schema: public; Owner: nexcrm
--

CREATE TYPE public.enum_sequences_status AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE public.enum_sequences_status OWNER TO nexcrm;

--
-- Name: enum_templates_channel; Type: TYPE; Schema: public; Owner: nexcrm
--

CREATE TYPE public.enum_templates_channel AS ENUM (
    'email',
    'whatsapp',
    'sms'
);


ALTER TYPE public.enum_templates_channel OWNER TO nexcrm;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: nexcrm
--

CREATE TYPE public.enum_users_role AS ENUM (
    'super_admin',
    'tenant_admin',
    'sales_manager',
    'senior_sales_rep',
    'sales_rep',
    'read_only_analyst'
);


ALTER TYPE public.enum_users_role OWNER TO nexcrm;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application_types; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.application_types (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    vertical character varying(50) NOT NULL,
    custom_fields_schema jsonb DEFAULT '{}'::jsonb,
    scoring_profile_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.application_types OWNER TO nexcrm;

--
-- Name: asset_folders; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.asset_folders (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    parent_folder_id uuid,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_folders OWNER TO nexcrm;

--
-- Name: asset_projects; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.asset_projects (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(50),
    description text,
    application_type_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.asset_projects OWNER TO nexcrm;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.assets (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes bigint NOT NULL,
    uploaded_by uuid NOT NULL,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    total_sends integer DEFAULT 0,
    total_downloads integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.assets OWNER TO nexcrm;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    action_type character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    old_value jsonb,
    new_value jsonb,
    ip_address character varying(45),
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO nexcrm;

--
-- Name: engagement_events; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.engagement_events (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    channel character varying(20) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    score_delta integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.engagement_events OWNER TO nexcrm;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.leads (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    company character varying(255),
    city character varying(100),
    source character varying(50) NOT NULL,
    application_type_id uuid,
    status public.enum_leads_status DEFAULT 'NEW'::public.enum_leads_status,
    lead_type public.enum_leads_lead_type DEFAULT 'COLD'::public.enum_leads_lead_type,
    score integer DEFAULT 0,
    assigned_rep_id uuid,
    enrolled_by uuid NOT NULL,
    gdpr_consent boolean DEFAULT false,
    opted_out boolean DEFAULT false,
    email_status character varying(20) DEFAULT 'valid'::character varying,
    notes text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    last_activity_at timestamp with time zone,
    converted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.leads OWNER TO nexcrm;

--
-- Name: nurturing_settings; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.nurturing_settings (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    cold_outreach_interval_days integer DEFAULT 5,
    warm_sequence_interval_days integer DEFAULT 2,
    stale_reengagement_interval_days integer DEFAULT 14,
    max_cold_attempts integer DEFAULT 6,
    daily_send_window_start character varying(5) DEFAULT '09:00'::character varying,
    daily_send_window_end character varying(5) DEFAULT '18:00'::character varying,
    allowed_send_days character varying(255)[] DEFAULT ARRAY['Monday'::character varying(255), 'Tuesday'::character varying(255), 'Wednesday'::character varying(255), 'Thursday'::character varying(255), 'Friday'::character varying(255), 'Saturday'::character varying(255)],
    blackout_dates character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    global_pause boolean DEFAULT false,
    global_pause_until timestamp with time zone,
    max_messages_per_week integer DEFAULT 3,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.nurturing_settings OWNER TO nexcrm;

--
-- Name: outreach_records; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.outreach_records (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    template_id uuid,
    channel character varying(20) NOT NULL,
    sent_at timestamp with time zone,
    status public.enum_outreach_records_status DEFAULT 'pending'::public.enum_outreach_records_status,
    failure_reason character varying(255),
    sequence_step integer,
    subject_line character varying(500),
    body_preview text,
    rep_id uuid,
    tracking_id character varying(100),
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.outreach_records OWNER TO nexcrm;

--
-- Name: routing_rules; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.routing_rules (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    condition_expression jsonb NOT NULL,
    action_config jsonb NOT NULL,
    priority integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.routing_rules OWNER TO nexcrm;

--
-- Name: scoring_profiles; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.scoring_profiles (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    event_weights jsonb NOT NULL,
    type_thresholds jsonb NOT NULL,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.scoring_profiles OWNER TO nexcrm;

--
-- Name: sequence_enrollments; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.sequence_enrollments (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    sequence_id uuid NOT NULL,
    current_step integer DEFAULT 0,
    started_at timestamp with time zone NOT NULL,
    next_step_at timestamp with time zone,
    status public.enum_sequence_enrollments_status DEFAULT 'active'::public.enum_sequence_enrollments_status,
    completed_at timestamp with time zone,
    exit_reason character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.sequence_enrollments OWNER TO nexcrm;

--
-- Name: sequences; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.sequences (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    trigger_type character varying(50) NOT NULL,
    lead_type_target character varying(20),
    steps jsonb DEFAULT '[]'::jsonb,
    status public.enum_sequences_status DEFAULT 'draft'::public.enum_sequences_status,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.sequences OWNER TO nexcrm;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.templates (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    channel public.enum_templates_channel DEFAULT 'email'::public.enum_templates_channel,
    subject character varying(500),
    body text NOT NULL,
    variables character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    category character varying(50) DEFAULT 'general'::character varying,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.templates OWNER TO nexcrm;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.tenants (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    subdomain character varying(100) NOT NULL,
    vertical_type character varying(50) NOT NULL,
    plan_tier character varying(50) DEFAULT 'standard'::character varying,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    branding jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.tenants OWNER TO nexcrm;

--
-- Name: users; Type: TABLE; Schema: public; Owner: nexcrm
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role public.enum_users_role NOT NULL,
    phone character varying(20),
    territory character varying(100),
    rep_tags character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    connected_gmail character varying(255),
    is_active boolean DEFAULT true,
    mfa_enabled boolean DEFAULT false,
    mfa_secret character varying(255),
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.users OWNER TO nexcrm;

--
-- Data for Name: application_types; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.application_types (id, tenant_id, name, vertical, custom_fields_schema, scoring_profile_id, is_active, created_at, updated_at) FROM stdin;
ed4b506d-923d-44bb-a6f7-0fd43a9c8307	00771436-6364-463c-bdcc-1b9d2a23536c	Undergraduate Admission	education	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
7619fe68-64e7-4de0-949b-660b01e23f40	00771436-6364-463c-bdcc-1b9d2a23536c	Postgraduate Admission	education	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	00771436-6364-463c-bdcc-1b9d2a23536c	Certificate Program	education	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	00771436-6364-463c-bdcc-1b9d2a23536c	Online Course	education	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	00771436-6364-463c-bdcc-1b9d2a23536c	Coaching / Test Prep	education	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
a1f32e44-e6a4-4e65-9e20-61f4785eb931	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Residential Plot	real_estate	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
a7d1dd93-030f-4269-b9d6-840aeb49f2c1	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	2BHK Apartment	real_estate	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	3BHK Apartment	real_estate	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
df5310ab-9912-4c51-93c7-1c8b9a1b3430	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Villa	real_estate	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
c198bcd7-c8f2-46c6-8006-c6a8e6313155	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Commercial Space	real_estate	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
b05d33e5-2ad8-4e24-ac54-59462331e279	41f6cf1a-6695-4163-a5c3-560d519bac96	Residential Construction	construction	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
db2ef6ba-2001-471d-a027-8f40d749bc06	41f6cf1a-6695-4163-a5c3-560d519bac96	Commercial Build	construction	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	41f6cf1a-6695-4163-a5c3-560d519bac96	Renovation/Fitout	construction	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
ca736aa4-7ae8-4d46-8a37-86ed6e7a6d1f	41f6cf1a-6695-4163-a5c3-560d519bac96	Interior Design	construction	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
4d50bfbb-6da8-4048-ab57-29a0885b5185	41f6cf1a-6695-4163-a5c3-560d519bac96	Project Consultation	construction	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
8e357aae-07d4-4fa4-9ca1-83368663eeb0	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Custom Software Development	it_services	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
6ac9f961-bd03-4ea4-9c92-8b55d0a23016	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Mobile App	it_services	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
9680c660-9446-42c6-b92c-a103dc9f807b	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Website / Portal	it_services	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
351da80f-1b8f-490e-b3db-0702c02ddf05	6dc57766-f52a-4f01-a0da-75511fb3f2a1	IT Consulting	it_services	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
493404d6-69c1-40f3-bc76-dc38add25fd9	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Cloud Migration	it_services	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
361c5f53-1d61-4727-a9a2-b00bb90e7eb1	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Retail Walk-in	auto_parts	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Online Order	auto_parts	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
5f0297da-06b3-4b1a-9d1a-004fba6aee7c	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Bulk B2B Order	auto_parts	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
b31bac55-2903-4b12-bfd5-bb18b7025243	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	OEM Partnership	auto_parts	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
394894dd-aad4-422f-afb6-7e5018cf757e	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Workshop Supply	auto_parts	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
e2e6d382-7c84-43ba-be48-fb206fd4c3b8	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Individual Residential	iot_aqi	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Institutional (School)	iot_aqi	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
f6d352e4-a370-46a4-a080-c989b5460f68	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Industrial Monitoring	iot_aqi	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
2e04ab4c-412b-4a68-87a7-2ad6b77770ca	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	B2B Bulk Order	iot_aqi	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
6eb312f7-4524-4e4f-b8f5-783d345e9ae9	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	API Data Service	iot_aqi	{}	\N	t	2026-05-27 04:34:16.651+00	2026-05-27 04:34:16.651+00
\.


--
-- Data for Name: asset_folders; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.asset_folders (id, tenant_id, project_id, name, parent_folder_id, sort_order, created_at, updated_at) FROM stdin;
a93beba4-37cb-482e-bcd1-96a5adab2edb	00771436-6364-463c-bdcc-1b9d2a23536c	5d32730b-6161-495c-a6cb-37df0db80d0f	Brochures	\N	0	2026-05-27 04:34:16.766+00	2026-05-27 04:34:16.766+00
fc42cb43-d6fb-4cc4-8a58-b1790ad8fba4	00771436-6364-463c-bdcc-1b9d2a23536c	5d32730b-6161-495c-a6cb-37df0db80d0f	Case Studies	\N	0	2026-05-27 04:34:16.779+00	2026-05-27 04:34:16.779+00
2ec530da-6ba7-47aa-9fe4-299172fc0f7a	00771436-6364-463c-bdcc-1b9d2a23536c	5d32730b-6161-495c-a6cb-37df0db80d0f	Discounts	\N	0	2026-05-27 04:34:16.788+00	2026-05-27 04:34:16.788+00
ca03311e-9650-452b-9dd3-2dfcba03847d	00771436-6364-463c-bdcc-1b9d2a23536c	5d32730b-6161-495c-a6cb-37df0db80d0f	Onboarding	\N	0	2026-05-27 04:34:16.798+00	2026-05-27 04:34:16.798+00
3a1eed0e-4ece-40e7-af2d-bcd2f56c9e12	00771436-6364-463c-bdcc-1b9d2a23536c	5d32730b-6161-495c-a6cb-37df0db80d0f	Post-Purchase	\N	0	2026-05-27 04:34:16.807+00	2026-05-27 04:34:16.807+00
db16e533-7054-490e-a91d-7686d26919a4	00771436-6364-463c-bdcc-1b9d2a23536c	5d32730b-6161-495c-a6cb-37df0db80d0f	Warranty	\N	0	2026-05-27 04:34:16.816+00	2026-05-27 04:34:16.816+00
f5bed53b-7090-43be-8582-1e7c78006f63	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b218d453-e889-4bf6-86c8-d70440776a12	Brochures	\N	0	2026-05-27 04:34:16.833+00	2026-05-27 04:34:16.833+00
27d0764f-6118-4ec4-a85d-a13a4434f287	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b218d453-e889-4bf6-86c8-d70440776a12	Case Studies	\N	0	2026-05-27 04:34:16.842+00	2026-05-27 04:34:16.842+00
81ac5f0f-ffe0-48da-82fa-1047a1d95f9d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b218d453-e889-4bf6-86c8-d70440776a12	Discounts	\N	0	2026-05-27 04:34:16.85+00	2026-05-27 04:34:16.85+00
26fe8b95-57e7-4441-a347-6e18d2da0a99	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b218d453-e889-4bf6-86c8-d70440776a12	Onboarding	\N	0	2026-05-27 04:34:16.86+00	2026-05-27 04:34:16.86+00
1645cf05-8113-4ebb-be08-30581fa962e3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b218d453-e889-4bf6-86c8-d70440776a12	Post-Purchase	\N	0	2026-05-27 04:34:16.868+00	2026-05-27 04:34:16.868+00
7e504525-cced-4f3d-9dcf-be1c910df066	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b218d453-e889-4bf6-86c8-d70440776a12	Warranty	\N	0	2026-05-27 04:34:16.876+00	2026-05-27 04:34:16.876+00
32b215bd-0dab-4b07-9954-4a69e9e100e0	41f6cf1a-6695-4163-a5c3-560d519bac96	c52676ac-7495-4c70-bb3c-8a58a1a27c0a	Brochures	\N	0	2026-05-27 04:34:16.892+00	2026-05-27 04:34:16.892+00
310b30a4-e76c-4618-bd1a-5339d50645f3	41f6cf1a-6695-4163-a5c3-560d519bac96	c52676ac-7495-4c70-bb3c-8a58a1a27c0a	Case Studies	\N	0	2026-05-27 04:34:16.9+00	2026-05-27 04:34:16.9+00
20149661-9d30-4589-b33d-96fdbb876be5	41f6cf1a-6695-4163-a5c3-560d519bac96	c52676ac-7495-4c70-bb3c-8a58a1a27c0a	Discounts	\N	0	2026-05-27 04:34:16.907+00	2026-05-27 04:34:16.907+00
81d896a0-4b6f-40cc-8b5a-4a6d74cd439b	41f6cf1a-6695-4163-a5c3-560d519bac96	c52676ac-7495-4c70-bb3c-8a58a1a27c0a	Onboarding	\N	0	2026-05-27 04:34:16.916+00	2026-05-27 04:34:16.916+00
ffba4edc-75a0-4366-96b8-2a4c3a71ff82	41f6cf1a-6695-4163-a5c3-560d519bac96	c52676ac-7495-4c70-bb3c-8a58a1a27c0a	Post-Purchase	\N	0	2026-05-27 04:34:16.924+00	2026-05-27 04:34:16.924+00
69b92b63-dfa9-47c8-ab3c-3a5b4bad31ff	41f6cf1a-6695-4163-a5c3-560d519bac96	c52676ac-7495-4c70-bb3c-8a58a1a27c0a	Warranty	\N	0	2026-05-27 04:34:16.932+00	2026-05-27 04:34:16.932+00
252910e1-cf94-4fb9-b2a3-10b12695f72e	6dc57766-f52a-4f01-a0da-75511fb3f2a1	3304e40f-95cd-4287-93d5-ada5512a5156	Brochures	\N	0	2026-05-27 04:34:16.949+00	2026-05-27 04:34:16.949+00
f60a6f95-20fd-4961-8597-9f8978fd3f2f	6dc57766-f52a-4f01-a0da-75511fb3f2a1	3304e40f-95cd-4287-93d5-ada5512a5156	Case Studies	\N	0	2026-05-27 04:34:16.959+00	2026-05-27 04:34:16.959+00
4b697f0b-8404-4e16-92b8-7634c23c4b47	6dc57766-f52a-4f01-a0da-75511fb3f2a1	3304e40f-95cd-4287-93d5-ada5512a5156	Discounts	\N	0	2026-05-27 04:34:16.966+00	2026-05-27 04:34:16.966+00
2e771bbe-b3c4-46b7-a26f-be69a08ba2cd	6dc57766-f52a-4f01-a0da-75511fb3f2a1	3304e40f-95cd-4287-93d5-ada5512a5156	Onboarding	\N	0	2026-05-27 04:34:16.975+00	2026-05-27 04:34:16.975+00
d17257c1-5730-4739-b26b-10df90e8fc9a	6dc57766-f52a-4f01-a0da-75511fb3f2a1	3304e40f-95cd-4287-93d5-ada5512a5156	Post-Purchase	\N	0	2026-05-27 04:34:16.987+00	2026-05-27 04:34:16.987+00
009655ae-d523-406b-89f3-f9e8717815b2	6dc57766-f52a-4f01-a0da-75511fb3f2a1	3304e40f-95cd-4287-93d5-ada5512a5156	Warranty	\N	0	2026-05-27 04:34:16.997+00	2026-05-27 04:34:16.997+00
e58f66e8-186d-46f8-8e45-fb45780f7535	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	b521ff8f-918e-4b3d-bc67-22fd321c4bcd	Brochures	\N	0	2026-05-27 04:34:17.014+00	2026-05-27 04:34:17.014+00
3f8c9d02-6c65-45aa-a33f-3da2b9f0c699	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	b521ff8f-918e-4b3d-bc67-22fd321c4bcd	Case Studies	\N	0	2026-05-27 04:34:17.016+00	2026-05-27 04:34:17.016+00
6168ee7d-751b-4176-ac5a-d135e46364ef	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	b521ff8f-918e-4b3d-bc67-22fd321c4bcd	Discounts	\N	0	2026-05-27 04:34:17.017+00	2026-05-27 04:34:17.017+00
a1a64682-0cb3-4711-834b-7a58aa9e2de8	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	b521ff8f-918e-4b3d-bc67-22fd321c4bcd	Onboarding	\N	0	2026-05-27 04:34:17.018+00	2026-05-27 04:34:17.018+00
56fa37e4-c3a6-454a-8743-018d7c7a31c2	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	b521ff8f-918e-4b3d-bc67-22fd321c4bcd	Post-Purchase	\N	0	2026-05-27 04:34:17.019+00	2026-05-27 04:34:17.019+00
214e91a3-bb61-49c9-9425-4082db60767b	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	b521ff8f-918e-4b3d-bc67-22fd321c4bcd	Warranty	\N	0	2026-05-27 04:34:17.021+00	2026-05-27 04:34:17.021+00
4815191e-278c-4c49-b6ed-3b10fd0efc61	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	d08e7838-9044-45af-b9ce-4011100ccf31	Brochures	\N	0	2026-05-27 04:34:17.023+00	2026-05-27 04:34:17.023+00
4116c334-5f97-4b6e-bd6c-42d725462796	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	d08e7838-9044-45af-b9ce-4011100ccf31	Case Studies	\N	0	2026-05-27 04:34:17.024+00	2026-05-27 04:34:17.024+00
3d10ebb6-4281-4a3f-83ed-e346620eb297	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	d08e7838-9044-45af-b9ce-4011100ccf31	Discounts	\N	0	2026-05-27 04:34:17.025+00	2026-05-27 04:34:17.025+00
de9ef80b-a9d9-49fb-b56e-2bf6d8538fcd	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	d08e7838-9044-45af-b9ce-4011100ccf31	Onboarding	\N	0	2026-05-27 04:34:17.026+00	2026-05-27 04:34:17.026+00
d700fef7-77f8-43ae-8874-c57b067df3f1	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	d08e7838-9044-45af-b9ce-4011100ccf31	Post-Purchase	\N	0	2026-05-27 04:34:17.028+00	2026-05-27 04:34:17.028+00
1477e790-2aac-46c6-9064-2af60db4a6a2	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	d08e7838-9044-45af-b9ce-4011100ccf31	Warranty	\N	0	2026-05-27 04:34:17.029+00	2026-05-27 04:34:17.029+00
\.


--
-- Data for Name: asset_projects; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.asset_projects (id, tenant_id, name, icon, description, application_type_id, created_at, updated_at) FROM stdin;
5d32730b-6161-495c-a6cb-37df0db80d0f	00771436-6364-463c-bdcc-1b9d2a23536c	EduVantage Institute Assets	📁	Marketing and sales assets for EduVantage Institute	\N	2026-05-27 04:34:16.765+00	2026-05-27 04:34:16.765+00
b218d453-e889-4bf6-86c8-d70440776a12	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Prime Realty Group Assets	📁	Marketing and sales assets for Prime Realty Group	\N	2026-05-27 04:34:16.823+00	2026-05-27 04:34:16.823+00
c52676ac-7495-4c70-bb3c-8a58a1a27c0a	41f6cf1a-6695-4163-a5c3-560d519bac96	BuildCraft Construction Assets	📁	Marketing and sales assets for BuildCraft Construction	\N	2026-05-27 04:34:16.883+00	2026-05-27 04:34:16.883+00
3304e40f-95cd-4287-93d5-ada5512a5156	6dc57766-f52a-4f01-a0da-75511fb3f2a1	TechNova IT Solutions Assets	📁	Marketing and sales assets for TechNova IT Solutions	\N	2026-05-27 04:34:16.94+00	2026-05-27 04:34:16.94+00
b521ff8f-918e-4b3d-bc67-22fd321c4bcd	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	AutoParts Express Assets	📁	Marketing and sales assets for AutoParts Express	\N	2026-05-27 04:34:17.004+00	2026-05-27 04:34:17.004+00
d08e7838-9044-45af-b9ce-4011100ccf31	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	CleanAir IoT Assets	📁	Marketing and sales assets for CleanAir IoT	\N	2026-05-27 04:34:17.022+00	2026-05-27 04:34:17.022+00
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.assets (id, tenant_id, folder_id, filename, original_name, file_path, mime_type, size_bytes, uploaded_by, version, is_active, total_sends, total_downloads, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.audit_logs (id, tenant_id, actor_id, action_type, entity_type, entity_id, old_value, new_value, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: engagement_events; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.engagement_events (id, tenant_id, lead_id, event_type, channel, metadata, score_delta, created_at) FROM stdin;
deb90cf8-679c-42dc-ae3e-ad587ff4dc98	00771436-6364-463c-bdcc-1b9d2a23536c	e9eba7b6-6e3a-40ca-8711-b1f76d5969e1	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
980a056b-1bbe-4a64-9f4a-d1545e87d26f	00771436-6364-463c-bdcc-1b9d2a23536c	e9eba7b6-6e3a-40ca-8711-b1f76d5969e1	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
2144a902-0f3b-4220-97d8-f66ecd199f60	00771436-6364-463c-bdcc-1b9d2a23536c	e9eba7b6-6e3a-40ca-8711-b1f76d5969e1	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
9f5065d6-b7d7-4ff9-9b2e-8bb6a7f36706	00771436-6364-463c-bdcc-1b9d2a23536c	e9eba7b6-6e3a-40ca-8711-b1f76d5969e1	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
beede354-191d-4130-af0c-ea9fb1138030	00771436-6364-463c-bdcc-1b9d2a23536c	9bad0333-ac91-4d75-8f73-4983d3992f2c	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
d96a170d-7780-4c98-923d-e8243f2504de	00771436-6364-463c-bdcc-1b9d2a23536c	9bad0333-ac91-4d75-8f73-4983d3992f2c	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
02ac9d7d-612c-481e-9e2d-5c19ee21ec65	00771436-6364-463c-bdcc-1b9d2a23536c	9bad0333-ac91-4d75-8f73-4983d3992f2c	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
d77df657-fd16-49e7-be44-0987e8715a54	00771436-6364-463c-bdcc-1b9d2a23536c	9bad0333-ac91-4d75-8f73-4983d3992f2c	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
39b26965-e7c1-4add-9b59-013a313c1d68	00771436-6364-463c-bdcc-1b9d2a23536c	9bad0333-ac91-4d75-8f73-4983d3992f2c	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
fd772546-8f7f-4bed-a5da-5db8650a22e7	00771436-6364-463c-bdcc-1b9d2a23536c	4dae2550-a569-42de-b6b1-ac697d2ab0d2	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
65d67e50-d133-42c4-8acc-d8d1560110f1	00771436-6364-463c-bdcc-1b9d2a23536c	4dae2550-a569-42de-b6b1-ac697d2ab0d2	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
5375125a-3d2c-4ab1-80fe-45e9aa026dfd	00771436-6364-463c-bdcc-1b9d2a23536c	4dae2550-a569-42de-b6b1-ac697d2ab0d2	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
3bf565be-7f0f-464c-9940-aa2125efab21	00771436-6364-463c-bdcc-1b9d2a23536c	4dae2550-a569-42de-b6b1-ac697d2ab0d2	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
8f1a6f97-2f0f-4a4d-8b78-0f5de7aba7bc	00771436-6364-463c-bdcc-1b9d2a23536c	5941c55e-5342-4557-b318-d5fa4c082799	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
e8ffe494-491d-4bfe-99be-2d24f7c272b4	00771436-6364-463c-bdcc-1b9d2a23536c	5941c55e-5342-4557-b318-d5fa4c082799	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
a30224df-a0ae-4433-9399-97c61ce79818	00771436-6364-463c-bdcc-1b9d2a23536c	5941c55e-5342-4557-b318-d5fa4c082799	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
9c90a817-3c7d-41c4-bf47-fc130c5b759f	00771436-6364-463c-bdcc-1b9d2a23536c	308c0477-ec15-4c6e-baa4-80c6ddc47288	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
ce45835e-33e0-4032-8be7-05361b1664e8	00771436-6364-463c-bdcc-1b9d2a23536c	cd647faf-e5f0-4a9e-a30e-bc7123a072a0	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
7a51946f-a0bc-4f0e-b68c-ff7f1b6111b3	00771436-6364-463c-bdcc-1b9d2a23536c	cd647faf-e5f0-4a9e-a30e-bc7123a072a0	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
6e2acf3c-8e7e-483e-bfd9-ea4a20a4c54e	00771436-6364-463c-bdcc-1b9d2a23536c	cd647faf-e5f0-4a9e-a30e-bc7123a072a0	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
4a1ca4d9-d76a-410b-8f4e-9ff293a2a27f	00771436-6364-463c-bdcc-1b9d2a23536c	cd647faf-e5f0-4a9e-a30e-bc7123a072a0	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
cfd79bbd-40f7-4072-8541-e74284f54dbe	00771436-6364-463c-bdcc-1b9d2a23536c	16dc0568-1224-45ef-ba54-89e2f7945c9d	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
86ff7574-b009-4602-8290-2d2c32e44aac	00771436-6364-463c-bdcc-1b9d2a23536c	16dc0568-1224-45ef-ba54-89e2f7945c9d	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
abdfa8db-319c-467d-bb85-cc88a858d339	00771436-6364-463c-bdcc-1b9d2a23536c	16dc0568-1224-45ef-ba54-89e2f7945c9d	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
c211007d-25bb-4612-a930-b61eef2b13f8	00771436-6364-463c-bdcc-1b9d2a23536c	9354276a-8400-454b-bb22-ab9fa77a4506	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
95db2d98-e411-48f9-8cfc-b6d47c058c89	00771436-6364-463c-bdcc-1b9d2a23536c	9354276a-8400-454b-bb22-ab9fa77a4506	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
ccfb4ad7-ee0f-4466-8586-e0559e9feb48	00771436-6364-463c-bdcc-1b9d2a23536c	9354276a-8400-454b-bb22-ab9fa77a4506	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
386149d9-7ebf-4bbb-aa0b-84f681cb0b74	00771436-6364-463c-bdcc-1b9d2a23536c	3eeb6c3a-70ff-4b87-8cdf-553f8941f983	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
9eebc699-421f-44d3-a188-0adb8065a485	00771436-6364-463c-bdcc-1b9d2a23536c	33c88c76-e3a4-440e-bc40-9970a4a9003f	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
6c4278c6-a59b-4371-9003-72fde74e36d3	00771436-6364-463c-bdcc-1b9d2a23536c	33c88c76-e3a4-440e-bc40-9970a4a9003f	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
b450e69e-8b43-47cf-a62d-697417b71550	00771436-6364-463c-bdcc-1b9d2a23536c	33c88c76-e3a4-440e-bc40-9970a4a9003f	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
b0d02d70-1e61-4317-88a1-a05e334ae0e9	00771436-6364-463c-bdcc-1b9d2a23536c	33c88c76-e3a4-440e-bc40-9970a4a9003f	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
aba387fe-45dc-4b4f-91c2-61ab93bf3b91	00771436-6364-463c-bdcc-1b9d2a23536c	c3abef18-44eb-48ae-a514-01784a00eddb	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
b575a6a1-3a9c-4858-817d-b2e9825d653f	00771436-6364-463c-bdcc-1b9d2a23536c	c3abef18-44eb-48ae-a514-01784a00eddb	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
a79f211a-3afc-412a-a147-8fdbf270cc6a	00771436-6364-463c-bdcc-1b9d2a23536c	a278e960-e5e6-455f-906a-2ffd3daa74ae	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
0554ed44-1eab-4b87-98c8-19abb269d0aa	00771436-6364-463c-bdcc-1b9d2a23536c	6f5604b1-d770-4e38-a93a-c5a95c8b2148	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
2db60909-c70f-4701-813d-2b7ea5322cd0	00771436-6364-463c-bdcc-1b9d2a23536c	6f5604b1-d770-4e38-a93a-c5a95c8b2148	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
1d0b8985-645d-4549-805a-fce5764862b7	00771436-6364-463c-bdcc-1b9d2a23536c	6f5604b1-d770-4e38-a93a-c5a95c8b2148	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
4f3ebf2f-6144-44bd-ad71-cf46563195e0	00771436-6364-463c-bdcc-1b9d2a23536c	6f5604b1-d770-4e38-a93a-c5a95c8b2148	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
28e6f7a0-b145-4393-8084-4774e1e18f50	00771436-6364-463c-bdcc-1b9d2a23536c	793b8580-a4d0-44ea-b523-50124904a051	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
1168513a-aa1a-4f59-9467-dec2086535fb	00771436-6364-463c-bdcc-1b9d2a23536c	793b8580-a4d0-44ea-b523-50124904a051	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
dd1bd38a-75ff-49fc-8997-6879a62a23a1	00771436-6364-463c-bdcc-1b9d2a23536c	6f0c0920-36ae-482e-88ff-2a07507d248f	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
98cdc498-e58b-446e-a437-9d14aab01afa	00771436-6364-463c-bdcc-1b9d2a23536c	6f0c0920-36ae-482e-88ff-2a07507d248f	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
aa744948-27cf-44e7-9776-46c012f6e201	00771436-6364-463c-bdcc-1b9d2a23536c	6f0c0920-36ae-482e-88ff-2a07507d248f	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
eca66d1a-a2f8-4ac4-a417-4c1950cdb10b	00771436-6364-463c-bdcc-1b9d2a23536c	c04f0689-2f78-492f-ae68-f5300fe17e0f	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
2bc37734-e1ac-40b4-a5ed-efcc27ccadf6	00771436-6364-463c-bdcc-1b9d2a23536c	1ff7a8de-3ed7-486a-877b-4abeb0cdf9b6	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
8e8bf96e-84ab-45af-9967-da4e67eb6458	00771436-6364-463c-bdcc-1b9d2a23536c	1ff7a8de-3ed7-486a-877b-4abeb0cdf9b6	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
4985ae83-9d0a-46cb-938c-9faf887f8eb1	00771436-6364-463c-bdcc-1b9d2a23536c	1ff7a8de-3ed7-486a-877b-4abeb0cdf9b6	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
2cbccf53-60ed-4716-aaae-b4c78155cf5a	00771436-6364-463c-bdcc-1b9d2a23536c	c8c5ef92-4d35-4190-a767-2b7895128530	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
83bf5a4d-90a1-4ff1-a90d-717dabab15b2	00771436-6364-463c-bdcc-1b9d2a23536c	c8c5ef92-4d35-4190-a767-2b7895128530	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
7d3d5ab1-8923-47f2-8d3b-e08d1f6c0512	00771436-6364-463c-bdcc-1b9d2a23536c	c8c5ef92-4d35-4190-a767-2b7895128530	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
9405b75a-22a1-4a77-92ef-690390c357ce	00771436-6364-463c-bdcc-1b9d2a23536c	c8c5ef92-4d35-4190-a767-2b7895128530	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
a116d5a2-e578-430f-bfa2-af7824637dd8	00771436-6364-463c-bdcc-1b9d2a23536c	c8c5ef92-4d35-4190-a767-2b7895128530	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
e8fb8c3c-3773-48ff-8916-186575a89b56	00771436-6364-463c-bdcc-1b9d2a23536c	e9847eda-c8a9-497e-987b-7c58bdb61c26	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
635308ff-9695-44a3-a9fb-f7d011de23c6	00771436-6364-463c-bdcc-1b9d2a23536c	d2a3e539-e00b-43a0-807d-fd37d0f44521	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
c1ce6bc2-39ed-4cc9-b6e0-50ee8ca266b8	00771436-6364-463c-bdcc-1b9d2a23536c	d2a3e539-e00b-43a0-807d-fd37d0f44521	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
8b31eb7f-c07b-4afa-a1a0-e0fbf3f94168	00771436-6364-463c-bdcc-1b9d2a23536c	acc65576-e094-48f9-adff-f42911c86a15	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
f05787b4-6c21-4cd7-89eb-a5b132eec5aa	00771436-6364-463c-bdcc-1b9d2a23536c	acc65576-e094-48f9-adff-f42911c86a15	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
795c2864-2159-4749-ba11-dfb6f46ff20a	00771436-6364-463c-bdcc-1b9d2a23536c	acc65576-e094-48f9-adff-f42911c86a15	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
1ff3fb8c-18c2-4669-bde1-d7bbe58c258d	00771436-6364-463c-bdcc-1b9d2a23536c	acc65576-e094-48f9-adff-f42911c86a15	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
b6599d34-e014-4e60-82cf-c624f7b06323	00771436-6364-463c-bdcc-1b9d2a23536c	92d63bc2-7e7f-4b37-a5f0-458c1a7d1630	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
bb18d080-2062-4ce4-96cf-1bf59725d33f	00771436-6364-463c-bdcc-1b9d2a23536c	be6d392d-8293-45c2-899d-033f6f436bb4	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
55e3a161-2ed7-4420-ba7d-7beff997611a	00771436-6364-463c-bdcc-1b9d2a23536c	9721cd2e-f3d9-4e43-83e4-9f51ce537de9	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
2dff514e-9573-4406-ae1f-8b6358040dd1	00771436-6364-463c-bdcc-1b9d2a23536c	9721cd2e-f3d9-4e43-83e4-9f51ce537de9	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
c7232e4f-f8e5-4af0-8df1-b1d86ad561a9	00771436-6364-463c-bdcc-1b9d2a23536c	9721cd2e-f3d9-4e43-83e4-9f51ce537de9	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
3721f40c-b110-4217-b586-94f66119732c	00771436-6364-463c-bdcc-1b9d2a23536c	9721cd2e-f3d9-4e43-83e4-9f51ce537de9	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
0aee28af-4234-412b-bf59-ffa53cafe9b6	00771436-6364-463c-bdcc-1b9d2a23536c	9721cd2e-f3d9-4e43-83e4-9f51ce537de9	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
886efb3b-15ae-48c3-be5b-48905fa0ba02	00771436-6364-463c-bdcc-1b9d2a23536c	361928e9-f668-4946-a0b8-0a16c14e9ae9	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
219f3f69-0ca2-4f6e-8c3e-6091c33f8ed4	00771436-6364-463c-bdcc-1b9d2a23536c	361928e9-f668-4946-a0b8-0a16c14e9ae9	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
76193983-2ee1-4db6-b2fb-16e25c1a49aa	00771436-6364-463c-bdcc-1b9d2a23536c	6dbd5eb3-5f8f-448f-933e-0b541785daa4	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
ee85543e-737d-4af7-bf50-63810f59d6a0	00771436-6364-463c-bdcc-1b9d2a23536c	6dbd5eb3-5f8f-448f-933e-0b541785daa4	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
b415a224-b350-4451-a637-e315ac77d6fc	00771436-6364-463c-bdcc-1b9d2a23536c	6dbd5eb3-5f8f-448f-933e-0b541785daa4	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
9bcf51a7-3e45-4fea-916c-e652633014f9	00771436-6364-463c-bdcc-1b9d2a23536c	eaebad0a-6c52-4a32-96b0-f2dd49edeedc	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
d33b3816-4c84-4cb4-afc6-ccbf2b4b91fe	00771436-6364-463c-bdcc-1b9d2a23536c	eaebad0a-6c52-4a32-96b0-f2dd49edeedc	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
0fad653d-761a-4e15-a08a-213ff548abc4	00771436-6364-463c-bdcc-1b9d2a23536c	cfae489f-7d99-4f59-81e6-4be4ee2dace2	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
f859f1ad-4fdc-4ed8-918b-1ed2f057dc55	00771436-6364-463c-bdcc-1b9d2a23536c	52922365-4278-418d-a1a4-a4f1c7b0e6d9	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
6c4b04d3-efd9-4887-92e5-cc78f87a5dc7	00771436-6364-463c-bdcc-1b9d2a23536c	52922365-4278-418d-a1a4-a4f1c7b0e6d9	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
e0102ef6-42bd-4e0e-834b-9945d3299f9f	00771436-6364-463c-bdcc-1b9d2a23536c	52922365-4278-418d-a1a4-a4f1c7b0e6d9	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
d7b74ddc-bb91-4c2b-8d84-a7b47e0264d1	00771436-6364-463c-bdcc-1b9d2a23536c	52922365-4278-418d-a1a4-a4f1c7b0e6d9	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
490753b2-288a-446a-ab99-24be25855e80	00771436-6364-463c-bdcc-1b9d2a23536c	52922365-4278-418d-a1a4-a4f1c7b0e6d9	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
935a273b-95e3-4af4-92b5-103359ddc8f8	00771436-6364-463c-bdcc-1b9d2a23536c	88a5830d-c053-4b98-9d21-209be80e854f	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
c772ef46-2d90-42a0-aca6-ed54f6007bbb	00771436-6364-463c-bdcc-1b9d2a23536c	88a5830d-c053-4b98-9d21-209be80e854f	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
5f7f6e52-a5f0-4a9a-ac22-a5ba0097d909	00771436-6364-463c-bdcc-1b9d2a23536c	4b5dba9a-c600-49f8-8125-380e43c1fe31	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
ad372580-4385-4ce7-84f9-abb6b5dcf7bb	00771436-6364-463c-bdcc-1b9d2a23536c	4b5dba9a-c600-49f8-8125-380e43c1fe31	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
1c7d120b-406b-45bc-b746-f08db96c4ad6	00771436-6364-463c-bdcc-1b9d2a23536c	4b5dba9a-c600-49f8-8125-380e43c1fe31	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
2f6f518d-aa68-4a30-b06b-58c093b0c6ae	00771436-6364-463c-bdcc-1b9d2a23536c	4b5dba9a-c600-49f8-8125-380e43c1fe31	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
1d596456-baea-4a40-b7d7-1a47ac8c98dc	00771436-6364-463c-bdcc-1b9d2a23536c	735556d0-f53f-41b8-b7d2-d260f1dd34ef	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
8e4de0a3-54f7-4e03-a6e3-21c06fd15baf	00771436-6364-463c-bdcc-1b9d2a23536c	735556d0-f53f-41b8-b7d2-d260f1dd34ef	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
465b659b-4064-4b81-b757-b10ceb59b1a9	00771436-6364-463c-bdcc-1b9d2a23536c	735556d0-f53f-41b8-b7d2-d260f1dd34ef	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
3eb33a5f-431a-4ff3-9d0e-199ce3a4e658	00771436-6364-463c-bdcc-1b9d2a23536c	735556d0-f53f-41b8-b7d2-d260f1dd34ef	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
d65a3944-154f-4876-9643-333e84dc23fd	00771436-6364-463c-bdcc-1b9d2a23536c	735556d0-f53f-41b8-b7d2-d260f1dd34ef	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
17df3d7b-1d35-47d2-9dc0-1f6a166aca16	00771436-6364-463c-bdcc-1b9d2a23536c	fa9d119e-80c3-4871-82d2-32df4e97769a	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
721fbae5-3644-4a7f-a200-3dacced3d37d	00771436-6364-463c-bdcc-1b9d2a23536c	fa9d119e-80c3-4871-82d2-32df4e97769a	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
4f723af7-2ccb-48da-a5e9-182a87287f36	00771436-6364-463c-bdcc-1b9d2a23536c	fa9d119e-80c3-4871-82d2-32df4e97769a	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
e200945d-07bb-4e1c-85d8-e889d366eb5c	00771436-6364-463c-bdcc-1b9d2a23536c	fa9d119e-80c3-4871-82d2-32df4e97769a	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
9d0270f0-e78a-4b0f-8529-276036cc703c	00771436-6364-463c-bdcc-1b9d2a23536c	fa9d119e-80c3-4871-82d2-32df4e97769a	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
d7837d3a-fb92-442b-a913-423bfc7afc94	00771436-6364-463c-bdcc-1b9d2a23536c	02bb618a-2d33-44c6-87f5-fbe5626012bb	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
49c16ec6-65f6-4b55-8e8b-ebe3da890b70	00771436-6364-463c-bdcc-1b9d2a23536c	02bb618a-2d33-44c6-87f5-fbe5626012bb	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
adb2263d-2216-4a27-b124-45aed0b66517	00771436-6364-463c-bdcc-1b9d2a23536c	02bb618a-2d33-44c6-87f5-fbe5626012bb	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
61d41219-c497-405e-83ca-aef419d5c646	00771436-6364-463c-bdcc-1b9d2a23536c	9c678d06-4107-4157-8f58-7dd70f8557e9	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
95f66367-97b5-419f-a376-7298b2114563	00771436-6364-463c-bdcc-1b9d2a23536c	b8b76ab5-6411-4730-a9c5-6475fb42472a	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
5f2c1255-85a2-46e2-9384-34a48238f4a1	00771436-6364-463c-bdcc-1b9d2a23536c	b8b76ab5-6411-4730-a9c5-6475fb42472a	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
dfcd724e-2aaa-4dab-91cd-d8dc1827e798	00771436-6364-463c-bdcc-1b9d2a23536c	b8b76ab5-6411-4730-a9c5-6475fb42472a	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
5dbd88bb-14e8-4c12-97f5-6e7640f9d93c	00771436-6364-463c-bdcc-1b9d2a23536c	bf41f5d2-93fd-4cb4-bf81-f98fcbe39887	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
9c05c435-6ef7-4d12-bf24-f305c5aaee29	00771436-6364-463c-bdcc-1b9d2a23536c	bf41f5d2-93fd-4cb4-bf81-f98fcbe39887	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
b90e13df-a799-43f6-9229-d4f3fc71cf24	00771436-6364-463c-bdcc-1b9d2a23536c	bf41f5d2-93fd-4cb4-bf81-f98fcbe39887	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
e024e92b-f63d-43c1-9caf-8f95840ad0af	00771436-6364-463c-bdcc-1b9d2a23536c	bf41f5d2-93fd-4cb4-bf81-f98fcbe39887	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
ddeea064-275f-4bc7-ad58-b390e82585a9	00771436-6364-463c-bdcc-1b9d2a23536c	265b222a-9126-49fa-9e0d-09dc5d4bdc7f	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
0b815436-2158-4c49-b881-e951a1a27e96	00771436-6364-463c-bdcc-1b9d2a23536c	265b222a-9126-49fa-9e0d-09dc5d4bdc7f	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
8ad08c73-21c4-4dd2-b5d4-b473be8df0b3	00771436-6364-463c-bdcc-1b9d2a23536c	265b222a-9126-49fa-9e0d-09dc5d4bdc7f	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
62798641-012d-44aa-a6f7-b0c11cb8434d	00771436-6364-463c-bdcc-1b9d2a23536c	6913dc1b-7817-4b1c-87f3-2ea0fc2d3211	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
dee042bf-6b76-481c-ab01-1b9307dc8c65	00771436-6364-463c-bdcc-1b9d2a23536c	6913dc1b-7817-4b1c-87f3-2ea0fc2d3211	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
b64814cf-cf79-4e19-9f80-e8277be6972c	00771436-6364-463c-bdcc-1b9d2a23536c	912a131b-a5ba-4265-a8c6-a74e4a805f66	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
a9e13502-015f-425e-9f99-14fbc7406763	00771436-6364-463c-bdcc-1b9d2a23536c	912a131b-a5ba-4265-a8c6-a74e4a805f66	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
cbad07b8-c4f4-4150-ba9b-b61775ae6614	00771436-6364-463c-bdcc-1b9d2a23536c	912a131b-a5ba-4265-a8c6-a74e4a805f66	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
a8543b5e-f66e-4de2-a930-c574846b9928	00771436-6364-463c-bdcc-1b9d2a23536c	912a131b-a5ba-4265-a8c6-a74e4a805f66	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
b76e7c35-9dca-41f8-927b-602354a8683b	00771436-6364-463c-bdcc-1b9d2a23536c	141f7e25-752c-4241-aa1d-01760d97954c	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
a6d6a78e-1caa-4c82-ba32-55f7c4684481	00771436-6364-463c-bdcc-1b9d2a23536c	141f7e25-752c-4241-aa1d-01760d97954c	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
cadf6924-c3df-4418-a96b-073b2c08e219	00771436-6364-463c-bdcc-1b9d2a23536c	141f7e25-752c-4241-aa1d-01760d97954c	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
08156584-cd36-4857-8100-29f0dcd2970f	00771436-6364-463c-bdcc-1b9d2a23536c	141f7e25-752c-4241-aa1d-01760d97954c	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
649917c2-e27e-442b-928c-f63dc9d7d7b2	00771436-6364-463c-bdcc-1b9d2a23536c	141f7e25-752c-4241-aa1d-01760d97954c	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
a82c8afb-35d1-46f8-9f37-a45cc0dda486	00771436-6364-463c-bdcc-1b9d2a23536c	c4a425ee-e37d-40df-a293-780d6aef1653	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
321157cc-6e64-4c59-b97d-2a52d3aac29b	00771436-6364-463c-bdcc-1b9d2a23536c	c4a425ee-e37d-40df-a293-780d6aef1653	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
878c6063-4b1f-44fb-b925-122d08ce16a7	00771436-6364-463c-bdcc-1b9d2a23536c	cc27cb57-fc71-4a1b-9b93-f33423ff61de	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
54f697e3-de39-4823-9201-c40f3f536dca	00771436-6364-463c-bdcc-1b9d2a23536c	cc27cb57-fc71-4a1b-9b93-f33423ff61de	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
70ff4181-8c01-4ac9-9b43-bf779ffcc97a	00771436-6364-463c-bdcc-1b9d2a23536c	cc27cb57-fc71-4a1b-9b93-f33423ff61de	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
786f0d61-f49e-481c-9ae5-66984f8af09d	00771436-6364-463c-bdcc-1b9d2a23536c	cc27cb57-fc71-4a1b-9b93-f33423ff61de	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
1efc906c-01cc-4e8b-b547-04a6d36e0860	00771436-6364-463c-bdcc-1b9d2a23536c	cc27cb57-fc71-4a1b-9b93-f33423ff61de	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
927c6365-efd4-4247-9a3e-7fc0817a80cf	00771436-6364-463c-bdcc-1b9d2a23536c	3a46fad0-fa1c-4d6d-a4fd-2c53065e0cf8	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
b6c1cde0-99f4-405e-996f-af5098e73392	00771436-6364-463c-bdcc-1b9d2a23536c	3a46fad0-fa1c-4d6d-a4fd-2c53065e0cf8	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
9c5653fe-0fbe-48f4-9fd7-9f1cdc36104b	00771436-6364-463c-bdcc-1b9d2a23536c	1e793397-e315-472b-afee-fd3b524c91ff	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
d8078b29-00bc-44b9-9cd0-9633f4e2bfbd	00771436-6364-463c-bdcc-1b9d2a23536c	1e793397-e315-472b-afee-fd3b524c91ff	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
512b7a17-1891-413a-83cf-78fa6213cebc	00771436-6364-463c-bdcc-1b9d2a23536c	1e793397-e315-472b-afee-fd3b524c91ff	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
671a9011-ec45-4c3c-8c93-f40377a301b4	00771436-6364-463c-bdcc-1b9d2a23536c	1e793397-e315-472b-afee-fd3b524c91ff	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
ff6cb35b-44e4-4dbe-a45e-c5904d7204c1	00771436-6364-463c-bdcc-1b9d2a23536c	bf3570b2-4894-44ff-aa2d-dfa2d2151ca9	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
f70deef8-daf7-499a-bde9-136b77cbc176	00771436-6364-463c-bdcc-1b9d2a23536c	bf3570b2-4894-44ff-aa2d-dfa2d2151ca9	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
52af5bf1-6d98-40a5-9f05-6cebddd58a47	00771436-6364-463c-bdcc-1b9d2a23536c	2edec824-ffed-4cf9-a2ad-4cae4663328d	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
92475d9f-40cf-49e8-a6d2-bfbbc84f8534	00771436-6364-463c-bdcc-1b9d2a23536c	69f3acad-78df-444f-8b80-eaf47eb35a2b	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
270b7b5d-4897-4ed5-98ba-5077264b6ac4	00771436-6364-463c-bdcc-1b9d2a23536c	69f3acad-78df-444f-8b80-eaf47eb35a2b	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
603ac6b5-74b5-46d1-b005-93a2bd08d811	00771436-6364-463c-bdcc-1b9d2a23536c	69f3acad-78df-444f-8b80-eaf47eb35a2b	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
7591dca7-d2d7-41b4-8a38-7b697e8f3ece	00771436-6364-463c-bdcc-1b9d2a23536c	69f3acad-78df-444f-8b80-eaf47eb35a2b	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
2987bfcd-4484-41f9-8beb-b1b66f3b6de0	00771436-6364-463c-bdcc-1b9d2a23536c	69f3acad-78df-444f-8b80-eaf47eb35a2b	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
b3a1b153-1484-42e1-8ea5-8a7e9f46046b	00771436-6364-463c-bdcc-1b9d2a23536c	1bef3cfa-d44a-41c6-9873-2bb1499b4cd4	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
f11dea20-423e-4a71-823a-84ebe8b204d1	00771436-6364-463c-bdcc-1b9d2a23536c	8d7d92bb-504c-485f-ba69-47682da46b64	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
f3c80200-7e5d-4e73-8272-f7f568a40b99	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	96db2f54-4e5c-417c-ab7c-2ec36889156c	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
db80d6b8-892d-4e1f-b6d4-d8f066b86aba	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	96db2f54-4e5c-417c-ab7c-2ec36889156c	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
be9f6cba-0083-40ec-9d69-f9ed6ebbeec5	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	96db2f54-4e5c-417c-ab7c-2ec36889156c	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
cb1fab96-b48d-4956-9c0c-6e57e152eaab	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	03fb869e-ab10-491f-98e1-145a2d27c6b3	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
7aae1868-e42a-4f28-a33c-1447c8630ec5	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	03fb869e-ab10-491f-98e1-145a2d27c6b3	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
3ef6e388-4243-4e5c-87b1-a5360dd991e3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	03fb869e-ab10-491f-98e1-145a2d27c6b3	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
06a1f6d4-1bd4-4f04-9947-e3a060d7654c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	03fb869e-ab10-491f-98e1-145a2d27c6b3	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
215c3162-3724-4f4e-9a1b-9fb771ade5aa	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	a7b4f478-7135-48a8-be66-e7bd59c0a988	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
0715cebc-eba8-4a67-8377-2ab90fd9fe3f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	a7b4f478-7135-48a8-be66-e7bd59c0a988	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
e7348d25-5f96-4755-a270-959547da7425	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	a7b4f478-7135-48a8-be66-e7bd59c0a988	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
4446a07d-fc1d-4ce6-8dba-2c76e8ef509e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eac424b2-5e7a-4a93-8586-d32e788fb19b	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
c773cccc-7e0e-4480-adbb-65d1a7a5bd9b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eac424b2-5e7a-4a93-8586-d32e788fb19b	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
9b23c2f1-ef41-48c7-8df0-74681474ac42	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eac424b2-5e7a-4a93-8586-d32e788fb19b	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
a2790a04-5f4d-40cd-89b4-debace5926a9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eac424b2-5e7a-4a93-8586-d32e788fb19b	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
0f061d57-9a3a-4413-a6ac-263a0e2781e3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eac424b2-5e7a-4a93-8586-d32e788fb19b	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
dcf22f98-be90-455c-bfb4-3229f814d9d8	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f7a6f7a3-9fce-4be5-94ef-9663e1d5f16c	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
1626062f-4b93-4188-b9a2-6863da25f5d7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f7a6f7a3-9fce-4be5-94ef-9663e1d5f16c	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
153ec42b-c785-4753-b131-a57b332f0a90	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f7a6f7a3-9fce-4be5-94ef-9663e1d5f16c	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
cbc62101-7edd-40f4-a575-5c00fcbb29b9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	881e57e6-754c-406a-b2a0-2a69fb384647	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
cc2a3da1-7b0e-47cf-a32f-f8341a4ef5b6	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	881e57e6-754c-406a-b2a0-2a69fb384647	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
9ddd2b20-f9f9-4489-835d-1e32b31c0150	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	881e57e6-754c-406a-b2a0-2a69fb384647	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
b7c5ac5b-f63d-457b-b921-b34e2611bd2f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	881e57e6-754c-406a-b2a0-2a69fb384647	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
161d5ac5-cdec-4744-b44f-af9b3106b715	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	a3c4b986-1d56-4509-8a13-4bc3916cda57	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
f2f6191d-1912-4f11-84e4-ad78d6703142	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	a3c4b986-1d56-4509-8a13-4bc3916cda57	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
a66c3a6a-161f-4d93-87c0-6cc5f6f32943	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	2d1838da-31c5-4bcc-933f-cafe099590e7	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
5ac6004e-2df9-456a-bf96-e83b483fe231	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	2d1838da-31c5-4bcc-933f-cafe099590e7	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
b48b3374-0234-4b07-8383-66b96158d2e6	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	2d1838da-31c5-4bcc-933f-cafe099590e7	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
8ee06a4b-33b5-4d10-b280-9e9ad3ce321f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	fb31a8e9-3e3d-4fd1-a489-6de802aa7f6d	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
ceddd2ba-c3d8-4d6f-844f-aae1e72d8261	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	fb31a8e9-3e3d-4fd1-a489-6de802aa7f6d	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
c05503db-ee54-4009-a118-ff97ef85122b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	fb31a8e9-3e3d-4fd1-a489-6de802aa7f6d	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
c3a9d8e8-139f-4419-be55-5e676ec37ad2	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	cf58617a-b495-49c5-815d-cbeba13f32fb	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
b63e445e-3cb8-4c2c-b246-2d2006985b00	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	cf58617a-b495-49c5-815d-cbeba13f32fb	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
f66b0b48-5cec-4cd7-9ca3-07c37439afb9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	265ddce1-c4a5-4d01-b400-a527a7848e88	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
0f51fafe-9a3e-49e6-b2cc-afe503ef4108	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	265ddce1-c4a5-4d01-b400-a527a7848e88	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
4fdc9aed-bc19-44be-9e1d-0db37402bd02	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	265ddce1-c4a5-4d01-b400-a527a7848e88	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
22167bff-ede6-482e-ba2d-f849d369c813	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eb5c3d8d-cb3b-497b-9c73-d93c39c04ade	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
b1c398fc-66e4-4085-b311-e1044542d717	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eb5c3d8d-cb3b-497b-9c73-d93c39c04ade	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
fb758693-98e3-4418-b1e3-6875faf3ec2b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eb5c3d8d-cb3b-497b-9c73-d93c39c04ade	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
bde29824-9c25-4c82-be52-d630c335137f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eb5c3d8d-cb3b-497b-9c73-d93c39c04ade	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
f70d5665-5e33-4538-8008-95385332bed8	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	eb5c3d8d-cb3b-497b-9c73-d93c39c04ade	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
c1877d0c-a0f9-45dd-97db-17ae37623e83	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	29fa6931-cd76-4cab-b97e-9b22a1580da4	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
6e26acab-2d03-47a6-84f1-8dd9253a3a9c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	29fa6931-cd76-4cab-b97e-9b22a1580da4	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
529db97d-1080-40a6-a788-cf9cb213dd86	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	29fa6931-cd76-4cab-b97e-9b22a1580da4	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
9d6b42b0-de3b-4b16-b2e3-4e2175a28d65	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	29fa6931-cd76-4cab-b97e-9b22a1580da4	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
fcbc2e73-a970-4614-97bd-be61a863530e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	29fa6931-cd76-4cab-b97e-9b22a1580da4	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
09464c9f-a1fa-40b1-8fe2-0caa216a7ab7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e39174d0-5be1-4c2e-a9ec-ca0cbc6e2d86	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
a1580a03-1605-4a88-84e4-c9205771c8b4	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e39174d0-5be1-4c2e-a9ec-ca0cbc6e2d86	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
95185884-8949-40ab-a3a0-bcc417e20d9b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e39174d0-5be1-4c2e-a9ec-ca0cbc6e2d86	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
d30ed909-6cc7-4866-9646-f5d2f93f60bd	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e39174d0-5be1-4c2e-a9ec-ca0cbc6e2d86	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
62b97397-cd9f-4e7e-b818-a7f39284a088	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e39174d0-5be1-4c2e-a9ec-ca0cbc6e2d86	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
2bfba90a-f938-458d-88cd-5a1a299c63a7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	39fadada-62d7-4a49-9e24-6d933a1c1e36	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
7fc0d064-86d1-4ed6-9234-e76bce2cc5f1	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	39fadada-62d7-4a49-9e24-6d933a1c1e36	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
fc593f3f-6673-444d-b5a0-ec2ba1bdbceb	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	39fadada-62d7-4a49-9e24-6d933a1c1e36	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
a38ae27d-bc61-4c46-86ac-534bae89a9cb	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b6e57ad0-042a-4729-aed1-cf4443b56b07	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
f1472697-692f-4ee3-9df8-abb696b2753e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b6e57ad0-042a-4729-aed1-cf4443b56b07	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
2551a7cb-0f9e-499b-817d-71b8e3d556df	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	104c5a25-4195-4b25-ba69-c71354304e9d	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
8cf56f51-a5b4-42a8-bf93-06f703f01d86	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	65bc782a-d486-49c3-962c-5ef9706f4e99	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
827a5847-eb40-4a73-817c-3490b8e73b50	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	65bc782a-d486-49c3-962c-5ef9706f4e99	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
d6614b6e-7572-42a9-a460-0fa7d192f861	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	65bc782a-d486-49c3-962c-5ef9706f4e99	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
72c226ed-4c26-4564-bcce-49f851f29531	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	65bc782a-d486-49c3-962c-5ef9706f4e99	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
fede9587-c25e-457c-a280-a1fdd1c21113	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	44a35b68-fa0c-4d8c-8da2-e7878e03f40d	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
3f38e2b8-4d89-4a2b-8941-069757622764	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	44a35b68-fa0c-4d8c-8da2-e7878e03f40d	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
619ab782-fc0c-4f1f-9200-f0db89a01d0a	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	44a35b68-fa0c-4d8c-8da2-e7878e03f40d	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
d2c2a844-c404-46b8-9304-1b2040bfc49e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	ca6416dc-1c8a-4b1a-ab01-b152c8948f81	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
ac2e5bab-e6a7-49f5-b3f6-a6a65785336a	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	ca6416dc-1c8a-4b1a-ab01-b152c8948f81	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
95c83ab4-b6a7-4aea-b440-1ab48bbc4551	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	ca6416dc-1c8a-4b1a-ab01-b152c8948f81	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
ecd19adc-7896-4ca8-9822-cde45f156da0	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	ca6416dc-1c8a-4b1a-ab01-b152c8948f81	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
2ff7c67b-9b8d-4d86-9322-3731b27ce09b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	ca6416dc-1c8a-4b1a-ab01-b152c8948f81	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
eb3b1795-1f29-4a07-b10d-7dfdeb125f3c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	99190212-1c8e-4de3-ac04-5042114f73b3	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
9b5f4b33-01fc-428c-90ab-95dc71c07601	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	99190212-1c8e-4de3-ac04-5042114f73b3	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
ff4af0db-9b12-48d9-b734-ddb15f09bc07	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	99190212-1c8e-4de3-ac04-5042114f73b3	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
34e28411-bf88-4ea5-9392-6e75687da0d5	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f947df8f-89ab-4f31-b5f2-33635ec8e3fa	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
210c9d1c-f741-4d88-a3fb-1d23a45e52b4	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f947df8f-89ab-4f31-b5f2-33635ec8e3fa	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
ecd5cf92-5fbe-4f02-ad63-457437b8bf92	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f947df8f-89ab-4f31-b5f2-33635ec8e3fa	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
1b8d0b84-9344-465d-a77e-173c9a497914	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f947df8f-89ab-4f31-b5f2-33635ec8e3fa	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
ccb9198d-0ed3-4a02-830c-fd3e0e3d4a2f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	f947df8f-89ab-4f31-b5f2-33635ec8e3fa	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
718c0081-508e-4bb9-b5e5-1613af23fea7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	ceab901a-7956-4af6-9ece-1e5291241487	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
1779961a-b326-47e1-98f5-bc34cb31bc96	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58429941-7011-44c6-b7ef-e6a1561b246b	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
51f00e43-03c8-46cd-98bc-ed8a6407103e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58429941-7011-44c6-b7ef-e6a1561b246b	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
929fecae-a212-488c-a878-d53de2d89a97	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58429941-7011-44c6-b7ef-e6a1561b246b	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
666ab248-ba35-441d-9d37-851f9d8a1fa0	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58429941-7011-44c6-b7ef-e6a1561b246b	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
aa60eeb3-a4d3-4e0c-8528-4f53f961c9c7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58429941-7011-44c6-b7ef-e6a1561b246b	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
fa35545f-a09e-4607-9337-b7d4989017c5	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	779d4ce3-28bc-42d2-88e0-0ed9c0f98ad5	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
b67255a4-c0ee-4df3-b675-52e595ba8c1f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	779d4ce3-28bc-42d2-88e0-0ed9c0f98ad5	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
071e986c-b14b-4ca1-9b9f-c4d01be0064b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	779d4ce3-28bc-42d2-88e0-0ed9c0f98ad5	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
94e8b9e8-ec49-43e0-8058-943c29c1d9e9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	9d995fbf-9950-4fe5-abc7-49e8765c8297	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
51fad408-edba-4fe1-90c6-c68c6c9b6878	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	9d995fbf-9950-4fe5-abc7-49e8765c8297	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
ea4ab970-b701-45e1-acd8-728b0d49ac54	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	9d995fbf-9950-4fe5-abc7-49e8765c8297	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
6ba4190f-7408-441d-be2c-bf7d637deddd	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	9d995fbf-9950-4fe5-abc7-49e8765c8297	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
1b874ae2-131a-4559-ad58-563f120cb7e0	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4964ea0a-c25c-4d9a-bc93-1a1833e6060c	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
dce7c5ec-0605-414c-a157-f36e6f3b9022	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4964ea0a-c25c-4d9a-bc93-1a1833e6060c	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
27f6568d-d6b2-4a73-bd0f-c3ca51e00d03	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4964ea0a-c25c-4d9a-bc93-1a1833e6060c	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
ec80a840-146e-4be3-9c15-5306d20b8514	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	fcfd3683-af59-46fc-b8d8-547e81f80a56	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
a4479618-eff1-4dbf-a091-5ec3f43f0346	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	fcfd3683-af59-46fc-b8d8-547e81f80a56	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
91969d4c-d7cf-455a-a3cb-950ffa7dbfaa	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	1e571a37-1716-4c31-814a-c4f9530fa3fd	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
c3f5c2cc-e584-410f-b904-579135cdbfa5	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	1e571a37-1716-4c31-814a-c4f9530fa3fd	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
ce234d32-42e9-4365-8888-b1f21e3c8564	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	1e571a37-1716-4c31-814a-c4f9530fa3fd	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
2d1944d0-be0a-413f-a24c-b024113c4313	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	1e571a37-1716-4c31-814a-c4f9530fa3fd	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
9e4abbea-f4df-42b8-b518-24c737081d69	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b106b1f6-1efb-4878-aa99-c660efcf5502	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
729c428d-5a32-405f-ab09-de77c999e608	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b106b1f6-1efb-4878-aa99-c660efcf5502	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
4a606d29-3ec2-492e-99b8-bb41c9d99f29	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b106b1f6-1efb-4878-aa99-c660efcf5502	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
5a9d030c-9a0e-4066-a8b9-7ddf1ced09ef	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b106b1f6-1efb-4878-aa99-c660efcf5502	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
33892338-81e2-4de4-a2db-afdc4b9feb84	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	7a6b9431-b474-407d-94ee-a2720d8370f7	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
9d71db01-91f5-477a-86b0-5d8bc7b561a1	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	7a6b9431-b474-407d-94ee-a2720d8370f7	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
1aab9b37-7ce7-4e86-80e5-13da652c0120	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	92990389-7521-4ef9-8aa4-2db61a043a6e	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
bfd760db-11f5-4111-b121-ee9e722aa852	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	7d244280-5393-479d-ae57-1830eb0be161	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
f956739b-f083-4e2a-888c-0f897e4facab	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	7d244280-5393-479d-ae57-1830eb0be161	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
fa0c8582-8b09-48cf-8cca-d3dfb695fba7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	7d244280-5393-479d-ae57-1830eb0be161	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
bcaf4458-6226-489e-97c9-fbe159d7ed17	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	7d244280-5393-479d-ae57-1830eb0be161	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
ad8b9920-6de8-4b8c-b87c-5cc9a7b41fb7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e7d6d17d-9368-4705-af86-8e80bd33860b	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
2ea78875-534d-4628-824b-e844e7520519	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e7d6d17d-9368-4705-af86-8e80bd33860b	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
6db91542-2e90-485b-8b6c-44ff53c53d0c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e7d6d17d-9368-4705-af86-8e80bd33860b	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
2f34fcc0-65a8-442f-8f29-18acc0652657	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	e7d6d17d-9368-4705-af86-8e80bd33860b	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
dd47fa41-9fca-43c2-89f3-1d9d35d37af4	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	01888463-b22d-4ca9-8c96-1da15dfa989c	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
f40e31be-d63b-4b58-92cd-855f1f5e7cf5	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	01888463-b22d-4ca9-8c96-1da15dfa989c	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
623e3688-038d-4341-853e-48370844ba26	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	01888463-b22d-4ca9-8c96-1da15dfa989c	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
f547713f-3b0b-4023-b680-3905de6c880c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	9bccaeee-a701-468c-9d6d-4f7257dd9dea	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
6f48468b-46bc-4ab3-a740-2f8e872188dd	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	486ea835-aa77-4705-b399-a41181373f45	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
3d90c33f-048c-475d-af40-f453936bf483	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	486ea835-aa77-4705-b399-a41181373f45	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
7ce40d60-6fb6-465b-b528-7adf5bc29a22	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	486ea835-aa77-4705-b399-a41181373f45	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
b89861e4-3489-4b65-821b-268417e6545d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	486ea835-aa77-4705-b399-a41181373f45	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
c0fa5ec8-1d1a-4359-be5a-9bd5c38d0137	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	c77b613e-ccfc-4eb8-b1a5-b57bf8054c65	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
b55b913b-ed30-453d-b6ad-952f7025d68b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	c77b613e-ccfc-4eb8-b1a5-b57bf8054c65	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
905107a1-c7bb-40f3-9508-4878dc296ad6	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	c77b613e-ccfc-4eb8-b1a5-b57bf8054c65	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
466ac7f1-3712-4504-90c0-25647d97f15f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	c77b613e-ccfc-4eb8-b1a5-b57bf8054c65	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
2e651ed1-b679-4913-823a-56865362a08e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	c77b613e-ccfc-4eb8-b1a5-b57bf8054c65	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
3d8d9385-8654-4896-86e0-9a9e4d82bf65	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b4a50cad-4b66-4a3e-9888-7a9a1d0df6a9	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
c801f58b-4341-4000-a777-ae045ba27596	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b4a50cad-4b66-4a3e-9888-7a9a1d0df6a9	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
d4583823-5dbd-4e7d-a0aa-f7b7eb79df26	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	b4a50cad-4b66-4a3e-9888-7a9a1d0df6a9	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
f5da9b73-94bf-4010-a2e9-5550e54920a1	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bf374d0d-8c55-4e3a-a64f-dcb0131fdf82	website_visit_high_intent	email	{}	10	2026-05-27 04:34:17.04+00
1c54317e-afc0-4c44-b1c0-5f7edec9400e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bf374d0d-8c55-4e3a-a64f-dcb0131fdf82	email_opened	email	{}	15	2026-05-27 04:34:17.04+00
676c68e6-657e-4c9d-b3a9-58796eccd795	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bf374d0d-8c55-4e3a-a64f-dcb0131fdf82	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
120e02ef-216f-4872-bc64-12fc8e898224	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bf374d0d-8c55-4e3a-a64f-dcb0131fdf82	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
15306af1-8121-471f-a3bc-a9a7224ce2a3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4aef3215-aab4-4a45-84d6-26d64d932aeb	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
ec2cc772-5d7e-4cee-9557-84676dda64e4	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4aef3215-aab4-4a45-84d6-26d64d932aeb	asset_downloaded	email	{}	20	2026-05-27 04:34:17.04+00
ba2b9af5-b96b-4493-9d9a-6a2edb2ae739	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4aef3215-aab4-4a45-84d6-26d64d932aeb	website_visit	email	{}	5	2026-05-27 04:34:17.04+00
868a5447-21a0-4c06-a71f-d8f8c53e9738	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4aef3215-aab4-4a45-84d6-26d64d932aeb	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
36b0fe5f-ca59-4299-9812-d2d29b96b74a	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4aef3215-aab4-4a45-84d6-26d64d932aeb	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
ccc308fd-4ef0-4c10-a0e7-4efaa93495f7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	0e1b672f-6d87-412c-9f3f-211af3510464	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
bed6a520-d987-4d16-b36c-ccf8d8ce442e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4b5cddbf-922b-4757-8a67-965de7e81bdf	website_visit	email	{}	20	2026-05-27 04:34:17.04+00
5508b16f-4b86-4a0b-a2d3-6ea6859f22d1	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4b5cddbf-922b-4757-8a67-965de7e81bdf	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
e049366b-d394-4de7-beea-01d8e9ec2659	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4b5cddbf-922b-4757-8a67-965de7e81bdf	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
04f20fbc-c311-443a-85a1-a58939cb6d80	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	4b5cddbf-922b-4757-8a67-965de7e81bdf	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
5b58d272-692e-4e32-8223-1b1c51988345	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58b80820-3268-4313-99b3-edb612147d34	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
8ba40d3b-743b-4c4f-9773-5b79dfae8646	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58b80820-3268-4313-99b3-edb612147d34	website_visit	email	{}	10	2026-05-27 04:34:17.04+00
7e99da35-b7a6-4915-8d9f-42a7f3153d94	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58b80820-3268-4313-99b3-edb612147d34	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
d9f78ae2-1701-4403-93a6-47bfbddff31d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	58b80820-3268-4313-99b3-edb612147d34	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
6bb68ce7-e21d-446f-8ff6-7ba08f4e3e7b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	36763bce-4440-4ec2-a199-b6cbe307f688	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
04f53d4e-bca0-465d-b2a8-54af79c1f4ea	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	36763bce-4440-4ec2-a199-b6cbe307f688	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
e81a0cdb-97e0-41ce-ab4c-b3fd9a914576	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	36763bce-4440-4ec2-a199-b6cbe307f688	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
289232fe-b496-452e-8e96-51a11bdafbff	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	36763bce-4440-4ec2-a199-b6cbe307f688	asset_downloaded	email	{}	15	2026-05-27 04:34:17.04+00
4c209654-7387-40ff-a166-abd89363d22c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bbdc3cb6-a1ff-4805-976d-91e55d49a02d	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
e8c965db-c5bf-4697-bba7-b609428853a4	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bbdc3cb6-a1ff-4805-976d-91e55d49a02d	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
fb3aebf1-7456-44eb-9f98-ca4f671a5650	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bbdc3cb6-a1ff-4805-976d-91e55d49a02d	website_visit_high_intent	email	{}	15	2026-05-27 04:34:17.04+00
434d4184-b34c-49d9-a7db-36ee3a85466b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bbdc3cb6-a1ff-4805-976d-91e55d49a02d	email_opened	email	{}	5	2026-05-27 04:34:17.04+00
21373aab-874b-4c55-9b29-4665042f2868	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	bbdc3cb6-a1ff-4805-976d-91e55d49a02d	email_cta_clicked	email	{}	5	2026-05-27 04:34:17.04+00
8f88a5fc-619b-4450-9748-bd87f33707e3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5c517f58-aa4f-452e-a70c-89ddbf6157a2	asset_downloaded	email	{}	10	2026-05-27 04:34:17.04+00
d388b2e1-b89f-4615-92e5-8648881537fc	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5c517f58-aa4f-452e-a70c-89ddbf6157a2	email_cta_clicked	email	{}	20	2026-05-27 04:34:17.04+00
c6741f04-709a-49bd-9f47-dbd98e93e6d7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5c517f58-aa4f-452e-a70c-89ddbf6157a2	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
af15b76f-b424-4fca-84b8-e1db9af1c3de	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5c517f58-aa4f-452e-a70c-89ddbf6157a2	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
1b994445-d213-4f1c-b914-62d5daabc6d7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5f5d29ff-901a-4c3a-ae88-8bdaaab8f870	email_cta_clicked	email	{}	15	2026-05-27 04:34:17.04+00
ed683b10-1916-4f18-a436-dc353939c3db	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5f5d29ff-901a-4c3a-ae88-8bdaaab8f870	email_opened	email	{}	10	2026-05-27 04:34:17.04+00
25771b0f-2513-4895-b6b6-70fde27b949f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5f5d29ff-901a-4c3a-ae88-8bdaaab8f870	website_visit	email	{}	15	2026-05-27 04:34:17.04+00
05763153-c6dd-42bc-bc44-d638f93cf0a9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5f5d29ff-901a-4c3a-ae88-8bdaaab8f870	email_opened	email	{}	20	2026-05-27 04:34:17.04+00
bc5705f4-c296-4928-bc42-6b9c32a871c8	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5f5d29ff-901a-4c3a-ae88-8bdaaab8f870	asset_downloaded	email	{}	5	2026-05-27 04:34:17.04+00
9add5a63-d241-4428-b3e8-0f897f3fccca	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	45cc851f-578d-421c-8797-9f37a1d5c477	website_visit_high_intent	email	{}	20	2026-05-27 04:34:17.04+00
58915d7e-ae68-4cf7-8b37-0d000f7e949e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	45cc851f-578d-421c-8797-9f37a1d5c477	email_cta_clicked	email	{}	10	2026-05-27 04:34:17.04+00
cd17d5f4-b9b0-4f02-af09-32cb648c6fcd	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	77d2c232-5893-44b7-a789-432d530c5c44	website_visit_high_intent	email	{}	5	2026-05-27 04:34:17.04+00
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.leads (id, tenant_id, first_name, last_name, email, phone, company, city, source, application_type_id, status, lead_type, score, assigned_rep_id, enrolled_by, gdpr_consent, opted_out, email_status, notes, custom_fields, last_activity_at, converted_at, created_at, updated_at) FROM stdin;
e9eba7b6-6e3a-40ca-8711-b1f76d5969e1	00771436-6364-463c-bdcc-1b9d2a23536c	Ravi	Rao	lead0_edu@example.com	+91-9163075455	Flipkart	Chennai	Ad Campaign	7619fe68-64e7-4de0-949b-660b01e23f40	STALE	STALE	29	58877d15-7397-4822-b42f-5de2034d64c1	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #1 for EduVantage Institute	{}	2026-05-03 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9bad0333-ac91-4d75-8f73-4983d3992f2c	00771436-6364-463c-bdcc-1b9d2a23536c	Deepak	Malhotra	lead1_edu@example.com	+91-9169258902	Unacademy	Hyderabad	Field Visit	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	PROPOSAL_SENT	HOT	111	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #2 for EduVantage Institute	{}	2026-05-06 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4dae2550-a569-42de-b6b1-ac697d2ab0d2	00771436-6364-463c-bdcc-1b9d2a23536c	Swati	Verma	lead2_edu@example.com	+91-9101455065	TCS	Hyderabad	Referral	7619fe68-64e7-4de0-949b-660b01e23f40	NEW	COLD	19	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #3 for EduVantage Institute	{}	2026-05-07 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5941c55e-5342-4557-b318-d5fa4c082799	00771436-6364-463c-bdcc-1b9d2a23536c	Nisha	Desai	lead3_edu@example.com	+91-9257220885	BYJU's	Kolkata	Website	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ACTIVE	COLD	33	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #4 for EduVantage Institute	{}	2026-05-20 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
308c0477-ec15-4c6e-baa4-80c6ddc47288	00771436-6364-463c-bdcc-1b9d2a23536c	Swati	Singh	lead4_edu@example.com	+91-9553857262	MindTree	Bangalore	Cold Call	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	ENGAGED	WARM	59	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #5 for EduVantage Institute	{}	2026-05-05 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cd647faf-e5f0-4a9e-a30e-bc7123a072a0	00771436-6364-463c-bdcc-1b9d2a23536c	Sneha	Singh	lead5_edu@example.com	+91-9249562043	Flipkart	Mumbai	Website	5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	NEW	COLD	10	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #6 for EduVantage Institute	{}	2026-05-17 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
16dc0568-1224-45ef-ba54-89e2f7945c9d	00771436-6364-463c-bdcc-1b9d2a23536c	Arjun	Mishra	lead6_edu@example.com	+91-9740963959	BYJU's	Bangalore	CSV Import	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	NEGOTIATION	HOT	119	58877d15-7397-4822-b42f-5de2034d64c1	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #7 for EduVantage Institute	{}	2026-05-27 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9354276a-8400-454b-bb22-ab9fa77a4506	00771436-6364-463c-bdcc-1b9d2a23536c	Divya	Nair	lead7_edu@example.com	+91-9272055571	Swiggy	Pune	Field Visit	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ENGAGED	HOT	81	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #8 for EduVantage Institute	{}	2026-05-25 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3eeb6c3a-70ff-4b87-8cdf-553f8941f983	00771436-6364-463c-bdcc-1b9d2a23536c	Nikhil	Shetty	lead8_edu@example.com	+91-9725457744	Razorpay	Bangalore	Website	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	ACTIVE	COLD	3	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #9 for EduVantage Institute	{}	2026-05-19 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
33c88c76-e3a4-440e-bc40-9970a4a9003f	00771436-6364-463c-bdcc-1b9d2a23536c	Swati	Reddy	lead9_edu@example.com	+91-9002099228	CRED	Bangalore	Cold Call	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	NEGOTIATION	HOT	131	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #10 for EduVantage Institute	{}	2026-05-15 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c3abef18-44eb-48ae-a514-01784a00eddb	00771436-6364-463c-bdcc-1b9d2a23536c	Ananya	Iyer	lead10_edu@example.com	+91-9801959383	MindTree	Ahmedabad	Ad Campaign	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	NEW	COLD	21	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #11 for EduVantage Institute	{}	2026-05-22 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a278e960-e5e6-455f-906a-2ffd3daa74ae	00771436-6364-463c-bdcc-1b9d2a23536c	Kavya	Verma	lead11_edu@example.com	+91-9439180857	TCS	Ahmedabad	Cold Call	5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	ACTIVE	COLD	23	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #12 for EduVantage Institute	{}	2026-05-08 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6f5604b1-d770-4e38-a93a-c5a95c8b2148	00771436-6364-463c-bdcc-1b9d2a23536c	Isha	Mishra	lead12_edu@example.com	+91-9071578508	BYJU's	Ahmedabad	Cold Call	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	CONVERTED	CONVERTED	14	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #13 for EduVantage Institute	{}	2026-05-20 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
793b8580-a4d0-44ea-b523-50124904a051	00771436-6364-463c-bdcc-1b9d2a23536c	Meera	Shetty	lead13_edu@example.com	+91-9831423761	BYJU's	Hyderabad	CSV Import	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	MEETING_SCHEDULED	HOT	100	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #14 for EduVantage Institute	{}	2026-05-18 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6f0c0920-36ae-482e-88ff-2a07507d248f	00771436-6364-463c-bdcc-1b9d2a23536c	Divya	Chopra	lead14_edu@example.com	+91-9652505576	Swiggy	Delhi	Website	1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	ENGAGED	WARM	56	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #15 for EduVantage Institute	{}	2026-05-22 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c04f0689-2f78-492f-ae68-f5300fe17e0f	00771436-6364-463c-bdcc-1b9d2a23536c	Anjali	Reddy	lead15_edu@example.com	+91-9071174499	PhonePe	Pune	Ad Campaign	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	LOST	LOST	65	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #16 for EduVantage Institute	{}	2026-05-08 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1ff7a8de-3ed7-486a-877b-4abeb0cdf9b6	00771436-6364-463c-bdcc-1b9d2a23536c	Nikhil	Singh	lead16_edu@example.com	+91-9516639372	Zomato	Bangalore	Referral	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ACTIVE	WARM	67	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #17 for EduVantage Institute	{}	2026-05-17 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c8c5ef92-4d35-4190-a767-2b7895128530	00771436-6364-463c-bdcc-1b9d2a23536c	Arjun	Desai	lead17_edu@example.com	+91-9748703959	Swiggy	Chennai	Ad Campaign	1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	ENGAGED	HOT	89	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #18 for EduVantage Institute	{}	2026-05-24 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e9847eda-c8a9-497e-987b-7c58bdb61c26	00771436-6364-463c-bdcc-1b9d2a23536c	Pooja	Chopra	lead18_edu@example.com	+91-9528575218	BYJU's	Delhi	Field Visit	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ENGAGED	WARM	66	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #19 for EduVantage Institute	{}	2026-05-14 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d2a3e539-e00b-43a0-807d-fd37d0f44521	00771436-6364-463c-bdcc-1b9d2a23536c	Arjun	Pandey	lead19_edu@example.com	+91-9150068271	Zomato	Bangalore	Event/Expo	7619fe68-64e7-4de0-949b-660b01e23f40	MEETING_SCHEDULED	HOT	91	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #20 for EduVantage Institute	{}	2026-05-27 04:34:16.654+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
acc65576-e094-48f9-adff-f42911c86a15	00771436-6364-463c-bdcc-1b9d2a23536c	Nikhil	Shah	lead20_edu@example.com	+91-9674168821	BYJU's	Pune	Event/Expo	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	STALE	STALE	27	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #21 for EduVantage Institute	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
92d63bc2-7e7f-4b37-a5f0-458c1a7d1630	00771436-6364-463c-bdcc-1b9d2a23536c	Siddharth	Reddy	lead21_edu@example.com	+91-9020331140	Swiggy	Hyderabad	Referral	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	ENGAGED	HOT	92	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #22 for EduVantage Institute	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
be6d392d-8293-45c2-899d-033f6f436bb4	00771436-6364-463c-bdcc-1b9d2a23536c	Vikram	Menon	lead22_edu@example.com	+91-9370750156	TCS	Bangalore	Referral	7619fe68-64e7-4de0-949b-660b01e23f40	ACTIVE	WARM	43	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #23 for EduVantage Institute	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9721cd2e-f3d9-4e43-83e4-9f51ce537de9	00771436-6364-463c-bdcc-1b9d2a23536c	Nikhil	Verma	lead23_edu@example.com	+91-9813514751	Swiggy	Hyderabad	Ad Campaign	7619fe68-64e7-4de0-949b-660b01e23f40	NEW	COLD	7	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #24 for EduVantage Institute	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
361928e9-f668-4946-a0b8-0a16c14e9ae9	00771436-6364-463c-bdcc-1b9d2a23536c	Divya	Iyer	lead24_edu@example.com	+91-9058851072	CRED	Mumbai	Website	1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	CONVERTED	CONVERTED	27	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #25 for EduVantage Institute	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6dbd5eb3-5f8f-448f-933e-0b541785daa4	00771436-6364-463c-bdcc-1b9d2a23536c	Manish	Reddy	lead25_edu@example.com	+91-9842346002	CRED	Ahmedabad	Referral	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	MEETING_SCHEDULED	HOT	131	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #26 for EduVantage Institute	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
eaebad0a-6c52-4a32-96b0-f2dd49edeedc	00771436-6364-463c-bdcc-1b9d2a23536c	Divya	Nair	lead26_edu@example.com	+91-9240268705	HCL	Delhi	Cold Call	5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	PROPOSAL_SENT	HOT	148	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #27 for EduVantage Institute	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cfae489f-7d99-4f59-81e6-4be4ee2dace2	00771436-6364-463c-bdcc-1b9d2a23536c	Ananya	Bhat	lead27_edu@example.com	+91-9931624514	Freshworks	Ahmedabad	Cold Call	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ACTIVE	WARM	47	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #28 for EduVantage Institute	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
52922365-4278-418d-a1a4-a4f1c7b0e6d9	00771436-6364-463c-bdcc-1b9d2a23536c	Kavya	Kulkarni	lead28_edu@example.com	+91-9377027114	HCL	Hyderabad	CSV Import	1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	ACTIVE	COLD	29	58877d15-7397-4822-b42f-5de2034d64c1	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #29 for EduVantage Institute	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
88a5830d-c053-4b98-9d21-209be80e854f	00771436-6364-463c-bdcc-1b9d2a23536c	Rohan	Agarwal	lead29_edu@example.com	+91-9625652003	BYJU's	Chennai	Event/Expo	5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	ENGAGED	WARM	71	58877d15-7397-4822-b42f-5de2034d64c1	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #30 for EduVantage Institute	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4b5dba9a-c600-49f8-8125-380e43c1fe31	00771436-6364-463c-bdcc-1b9d2a23536c	Nisha	Bhat	lead30_edu@example.com	+91-9759555274	Zoho	Mumbai	Referral	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	LOST	LOST	2	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #31 for EduVantage Institute	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
735556d0-f53f-41b8-b7d2-d260f1dd34ef	00771436-6364-463c-bdcc-1b9d2a23536c	Swati	Pandey	lead31_edu@example.com	+91-9190783988	BYJU's	Chennai	Website	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ENGAGED	WARM	64	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #32 for EduVantage Institute	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
fa9d119e-80c3-4871-82d2-32df4e97769a	00771436-6364-463c-bdcc-1b9d2a23536c	Siddharth	Chopra	lead32_edu@example.com	+91-9054315488	Zomato	Bangalore	Referral	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ACTIVE	COLD	15	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #33 for EduVantage Institute	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
02bb618a-2d33-44c6-87f5-fbe5626012bb	00771436-6364-463c-bdcc-1b9d2a23536c	Rohan	Agarwal	lead33_edu@example.com	+91-9089108437	BYJU's	Chennai	CSV Import	7619fe68-64e7-4de0-949b-660b01e23f40	MEETING_SCHEDULED	HOT	115	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #34 for EduVantage Institute	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9c678d06-4107-4157-8f58-7dd70f8557e9	00771436-6364-463c-bdcc-1b9d2a23536c	Deepak	Kulkarni	lead34_edu@example.com	+91-9818275295	Flipkart	Mumbai	Field Visit	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	NEGOTIATION	HOT	139	58877d15-7397-4822-b42f-5de2034d64c1	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #35 for EduVantage Institute	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b8b76ab5-6411-4730-a9c5-6475fb42472a	00771436-6364-463c-bdcc-1b9d2a23536c	Kavya	Joshi	lead35_edu@example.com	+91-9668601867	Swiggy	Bangalore	Ad Campaign	5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	ACTIVE	WARM	77	58877d15-7397-4822-b42f-5de2034d64c1	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #36 for EduVantage Institute	{}	2026-04-30 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
bf41f5d2-93fd-4cb4-bf81-f98fcbe39887	00771436-6364-463c-bdcc-1b9d2a23536c	Nikhil	Malhotra	lead36_edu@example.com	+91-9386406244	Zoho	Mumbai	Field Visit	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	CONVERTED	CONVERTED	15	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #37 for EduVantage Institute	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
265b222a-9126-49fa-9e0d-09dc5d4bdc7f	00771436-6364-463c-bdcc-1b9d2a23536c	Rohan	Kulkarni	lead37_edu@example.com	+91-9358273368	MindTree	Pune	Field Visit	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	ACTIVE	WARM	64	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #38 for EduVantage Institute	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6913dc1b-7817-4b1c-87f3-2ea0fc2d3211	00771436-6364-463c-bdcc-1b9d2a23536c	Manish	Gupta	lead38_edu@example.com	+91-9367470696	Flipkart	Ahmedabad	CSV Import	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	PROPOSAL_SENT	HOT	81	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #39 for EduVantage Institute	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
912a131b-a5ba-4265-a8c6-a74e4a805f66	00771436-6364-463c-bdcc-1b9d2a23536c	Divya	Agarwal	lead39_edu@example.com	+91-9724424557	Swiggy	Kolkata	Event/Expo	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	PROPOSAL_SENT	HOT	86	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #40 for EduVantage Institute	{}	2026-05-13 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
141f7e25-752c-4241-aa1d-01760d97954c	00771436-6364-463c-bdcc-1b9d2a23536c	Anjali	Reddy	lead40_edu@example.com	+91-9119489787	Freshworks	Mumbai	Field Visit	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	STALE	STALE	0	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #41 for EduVantage Institute	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c4a425ee-e37d-40df-a293-780d6aef1653	00771436-6364-463c-bdcc-1b9d2a23536c	Isha	Mishra	lead41_edu@example.com	+91-9817062003	Zomato	Mumbai	Field Visit	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	ENGAGED	HOT	149	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #42 for EduVantage Institute	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cc27cb57-fc71-4a1b-9b93-f33423ff61de	00771436-6364-463c-bdcc-1b9d2a23536c	Meera	Joshi	lead42_edu@example.com	+91-9215816552	Zoho	Ahmedabad	CSV Import	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ACTIVE	COLD	9	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #43 for EduVantage Institute	{}	2026-05-08 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3a46fad0-fa1c-4d6d-a4fd-2c53065e0cf8	00771436-6364-463c-bdcc-1b9d2a23536c	Aditya	Singh	lead43_edu@example.com	+91-9424346590	Zoho	Kolkata	CSV Import	5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	PROPOSAL_SENT	HOT	121	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #44 for EduVantage Institute	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1e793397-e315-472b-afee-fd3b524c91ff	00771436-6364-463c-bdcc-1b9d2a23536c	Nikhil	Mehta	lead44_edu@example.com	+91-9283281039	Wipro	Mumbai	Event/Expo	ed4b506d-923d-44bb-a6f7-0fd43a9c8307	ENGAGED	WARM	71	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #45 for EduVantage Institute	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
bf3570b2-4894-44ff-aa2d-dfa2d2151ca9	00771436-6364-463c-bdcc-1b9d2a23536c	Pooja	Malhotra	lead45_edu@example.com	+91-9915134270	TCS	Pune	Referral	1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	LOST	LOST	81	58877d15-7397-4822-b42f-5de2034d64c1	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #46 for EduVantage Institute	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
2edec824-ffed-4cf9-a2ad-4cae4663328d	00771436-6364-463c-bdcc-1b9d2a23536c	Rohan	Singh	lead46_edu@example.com	+91-9961836915	PhonePe	Mumbai	Field Visit	5ee8572f-ed8e-4fef-9205-f4ddb325ee9b	ENGAGED	WARM	40	ec160ad3-23b5-4373-bb10-153414f8a39f	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #47 for EduVantage Institute	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
69f3acad-78df-444f-8b80-eaf47eb35a2b	00771436-6364-463c-bdcc-1b9d2a23536c	Siddharth	Pandey	lead47_edu@example.com	+91-9135124963	Infosys	Mumbai	CSV Import	836c7a7d-1fd4-4b41-830a-27b29cf6b3b8	ACTIVE	WARM	60	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #48 for EduVantage Institute	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1bef3cfa-d44a-41c6-9873-2bb1499b4cd4	00771436-6364-463c-bdcc-1b9d2a23536c	Rohan	Desai	lead48_edu@example.com	+91-9134279812	Flipkart	Chennai	CSV Import	1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	CONVERTED	CONVERTED	51	b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #49 for EduVantage Institute	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
8d7d92bb-504c-485f-ba69-47682da46b64	00771436-6364-463c-bdcc-1b9d2a23536c	Ananya	Mehta	lead49_edu@example.com	+91-9103965997	PhonePe	Ahmedabad	CSV Import	1ddc78c2-249e-47ea-8b10-cb0d2ab7fec4	ACTIVE	WARM	60	a89a196e-f263-4380-924c-caa51edbb75b	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	t	f	valid	Lead #50 for EduVantage Institute	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
96db2f54-4e5c-417c-ab7c-2ec36889156c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nisha	Mishra	lead0_realestate@example.com	+91-9518317433	Flipkart	Bangalore	CSV Import	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	STALE	STALE	52	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #1 for Prime Realty Group	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
03fb869e-ab10-491f-98e1-145a2d27c6b3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nikhil	Shah	lead1_realestate@example.com	+91-9965172247	Flipkart	Delhi	Cold Call	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	MEETING_SCHEDULED	HOT	143	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #2 for Prime Realty Group	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a7b4f478-7135-48a8-be66-e7bd59c0a988	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Divya	Pandey	lead2_realestate@example.com	+91-9896343572	CRED	Chennai	Ad Campaign	df5310ab-9912-4c51-93c7-1c8b9a1b3430	NEW	COLD	33	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #3 for Prime Realty Group	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
eac424b2-5e7a-4a93-8586-d32e788fb19b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nisha	Menon	lead3_realestate@example.com	+91-9601380302	Razorpay	Pune	Ad Campaign	df5310ab-9912-4c51-93c7-1c8b9a1b3430	NEW	COLD	14	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #4 for Prime Realty Group	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f7a6f7a3-9fce-4be5-94ef-9663e1d5f16c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Ananya	Nair	lead4_realestate@example.com	+91-9620131244	Wipro	Ahmedabad	Field Visit	df5310ab-9912-4c51-93c7-1c8b9a1b3430	ACTIVE	COLD	38	9bcbbac3-88bc-4769-9ff2-e7da4d71adb1	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #5 for Prime Realty Group	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
881e57e6-754c-406a-b2a0-2a69fb384647	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Isha	Agarwal	lead5_realestate@example.com	+91-9096171312	Flipkart	Kolkata	Cold Call	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	NEW	COLD	31	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #6 for Prime Realty Group	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a3c4b986-1d56-4509-8a13-4bc3916cda57	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Vikram	Iyer	lead6_realestate@example.com	+91-9148868478	Wipro	Hyderabad	CSV Import	a1f32e44-e6a4-4e65-9e20-61f4785eb931	ACTIVE	COLD	38	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #7 for Prime Realty Group	{}	2026-05-13 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
2d1838da-31c5-4bcc-933f-cafe099590e7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Siddharth	Joshi	lead7_realestate@example.com	+91-9793702407	Zoho	Hyderabad	Field Visit	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	ACTIVE	COLD	12	9bcbbac3-88bc-4769-9ff2-e7da4d71adb1	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #8 for Prime Realty Group	{}	2026-05-15 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
fb31a8e9-3e3d-4fd1-a489-6de802aa7f6d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Anjali	Malhotra	lead8_realestate@example.com	+91-9681096125	Infosys	Kolkata	Website	c198bcd7-c8f2-46c6-8006-c6a8e6313155	PROPOSAL_SENT	HOT	88	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #9 for Prime Realty Group	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cf58617a-b495-49c5-815d-cbeba13f32fb	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Kavya	Kulkarni	lead9_realestate@example.com	+91-9282148187	Infosys	Delhi	Referral	a1f32e44-e6a4-4e65-9e20-61f4785eb931	MEETING_SCHEDULED	HOT	121	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #10 for Prime Realty Group	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
265ddce1-c4a5-4d01-b400-a527a7848e88	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Isha	Nair	lead10_realestate@example.com	+91-9143770281	Unacademy	Hyderabad	Referral	df5310ab-9912-4c51-93c7-1c8b9a1b3430	MEETING_SCHEDULED	HOT	139	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #11 for Prime Realty Group	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
eb5c3d8d-cb3b-497b-9c73-d93c39c04ade	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Vikram	Shah	lead11_realestate@example.com	+91-9210253472	Wipro	Chennai	Event/Expo	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	MEETING_SCHEDULED	HOT	146	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #12 for Prime Realty Group	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
29fa6931-cd76-4cab-b97e-9b22a1580da4	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nisha	Nair	lead12_realestate@example.com	+91-9462027254	BYJU's	Ahmedabad	Referral	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	CONVERTED	CONVERTED	19	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #13 for Prime Realty Group	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e39174d0-5be1-4c2e-a9ec-ca0cbc6e2d86	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Manish	Verma	lead13_realestate@example.com	+91-9191242918	Wipro	Ahmedabad	Website	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	ACTIVE	COLD	27	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #14 for Prime Realty Group	{}	2026-05-03 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
39fadada-62d7-4a49-9e24-6d933a1c1e36	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Siddharth	Shah	lead14_realestate@example.com	+91-9019057088	Razorpay	Ahmedabad	CSV Import	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	ENGAGED	HOT	145	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #15 for Prime Realty Group	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b6e57ad0-042a-4729-aed1-cf4443b56b07	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Isha	Nair	lead15_realestate@example.com	+91-9430498573	PhonePe	Bangalore	Event/Expo	a1f32e44-e6a4-4e65-9e20-61f4785eb931	LOST	LOST	49	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #16 for Prime Realty Group	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
104c5a25-4195-4b25-ba69-c71354304e9d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Kavya	Kulkarni	lead16_realestate@example.com	+91-9707324675	Freshworks	Delhi	CSV Import	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	ACTIVE	WARM	48	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #17 for Prime Realty Group	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
65bc782a-d486-49c3-962c-5ef9706f4e99	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Swati	Reddy	lead17_realestate@example.com	+91-9373100853	Wipro	Chennai	CSV Import	df5310ab-9912-4c51-93c7-1c8b9a1b3430	MEETING_SCHEDULED	HOT	125	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #18 for Prime Realty Group	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
44a35b68-fa0c-4d8c-8da2-e7878e03f40d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Kavya	Bhat	lead18_realestate@example.com	+91-9148641606	MindTree	Delhi	Ad Campaign	df5310ab-9912-4c51-93c7-1c8b9a1b3430	NEGOTIATION	HOT	118	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #19 for Prime Realty Group	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ca6416dc-1c8a-4b1a-ab01-b152c8948f81	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Manish	Nair	lead19_realestate@example.com	+91-9242236246	MindTree	Delhi	Field Visit	a1f32e44-e6a4-4e65-9e20-61f4785eb931	ENGAGED	WARM	44	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #20 for Prime Realty Group	{}	2026-05-03 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
99190212-1c8e-4de3-ac04-5042114f73b3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Vikram	Bhat	lead20_realestate@example.com	+91-9356112503	Unacademy	Delhi	Website	df5310ab-9912-4c51-93c7-1c8b9a1b3430	STALE	STALE	138	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #21 for Prime Realty Group	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f947df8f-89ab-4f31-b5f2-33635ec8e3fa	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Rohan	Nair	lead21_realestate@example.com	+91-9736203639	HCL	Ahmedabad	Field Visit	df5310ab-9912-4c51-93c7-1c8b9a1b3430	ENGAGED	HOT	81	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #22 for Prime Realty Group	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ceab901a-7956-4af6-9ece-1e5291241487	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Pooja	Reddy	lead22_realestate@example.com	+91-9332542560	CRED	Bangalore	Field Visit	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	ACTIVE	COLD	13	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #23 for Prime Realty Group	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
58429941-7011-44c6-b7ef-e6a1561b246b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Arjun	Kulkarni	lead23_realestate@example.com	+91-9046168171	Wipro	Hyderabad	CSV Import	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	ACTIVE	WARM	77	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #24 for Prime Realty Group	{}	2026-05-08 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
779d4ce3-28bc-42d2-88e0-0ed9c0f98ad5	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Manish	Rao	lead24_realestate@example.com	+91-9943425834	Razorpay	Ahmedabad	Cold Call	df5310ab-9912-4c51-93c7-1c8b9a1b3430	CONVERTED	CONVERTED	83	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #25 for Prime Realty Group	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9d995fbf-9950-4fe5-abc7-49e8765c8297	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Ananya	Shah	lead25_realestate@example.com	+91-9738408702	Unacademy	Bangalore	Website	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	ENGAGED	WARM	42	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #26 for Prime Realty Group	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4964ea0a-c25c-4d9a-bc93-1a1833e6060c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nikhil	Shah	lead26_realestate@example.com	+91-9755803535	Infosys	Hyderabad	Referral	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	ACTIVE	WARM	68	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #27 for Prime Realty Group	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
fcfd3683-af59-46fc-b8d8-547e81f80a56	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Anjali	Shah	lead27_realestate@example.com	+91-9851744490	CRED	Ahmedabad	CSV Import	df5310ab-9912-4c51-93c7-1c8b9a1b3430	ENGAGED	WARM	49	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #28 for Prime Realty Group	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1e571a37-1716-4c31-814a-c4f9530fa3fd	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Ananya	Verma	lead28_realestate@example.com	+91-9697053190	Zoho	Hyderabad	Field Visit	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	MEETING_SCHEDULED	HOT	126	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #29 for Prime Realty Group	{}	2026-05-04 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b106b1f6-1efb-4878-aa99-c660efcf5502	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Divya	Bhat	lead29_realestate@example.com	+91-9979751879	CRED	Mumbai	Referral	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	ENGAGED	WARM	40	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #30 for Prime Realty Group	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
7a6b9431-b474-407d-94ee-a2720d8370f7	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Anjali	Singh	lead30_realestate@example.com	+91-9316877951	CRED	Bangalore	Referral	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	LOST	LOST	117	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #31 for Prime Realty Group	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
92990389-7521-4ef9-8aa4-2db61a043a6e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Karan	Joshi	lead31_realestate@example.com	+91-9518606269	BYJU's	Pune	Website	df5310ab-9912-4c51-93c7-1c8b9a1b3430	NEGOTIATION	HOT	123	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #32 for Prime Realty Group	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
7d244280-5393-479d-ae57-1830eb0be161	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nisha	Pandey	lead32_realestate@example.com	+91-9106286537	Zoho	Delhi	Referral	c198bcd7-c8f2-46c6-8006-c6a8e6313155	ENGAGED	WARM	57	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #33 for Prime Realty Group	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e7d6d17d-9368-4705-af86-8e80bd33860b	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Ananya	Joshi	lead33_realestate@example.com	+91-9374398493	Infosys	Bangalore	Referral	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	ACTIVE	COLD	8	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #34 for Prime Realty Group	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
01888463-b22d-4ca9-8c96-1da15dfa989c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Aditya	Mehta	lead34_realestate@example.com	+91-9988722776	PhonePe	Kolkata	Event/Expo	df5310ab-9912-4c51-93c7-1c8b9a1b3430	ENGAGED	HOT	92	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #35 for Prime Realty Group	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9bccaeee-a701-468c-9d6d-4f7257dd9dea	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Arjun	Gupta	lead35_realestate@example.com	+91-9973476991	Infosys	Delhi	Event/Expo	c198bcd7-c8f2-46c6-8006-c6a8e6313155	NEW	COLD	33	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #36 for Prime Realty Group	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
486ea835-aa77-4705-b399-a41181373f45	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Manish	Pandey	lead36_realestate@example.com	+91-9754065141	HCL	Delhi	Field Visit	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	CONVERTED	CONVERTED	17	9bcbbac3-88bc-4769-9ff2-e7da4d71adb1	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #37 for Prime Realty Group	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c77b613e-ccfc-4eb8-b1a5-b57bf8054c65	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Isha	Rao	lead37_realestate@example.com	+91-9380588808	BYJU's	Bangalore	Referral	a1f32e44-e6a4-4e65-9e20-61f4785eb931	NEW	COLD	0	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #38 for Prime Realty Group	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b4a50cad-4b66-4a3e-9888-7a9a1d0df6a9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Rohan	Pandey	lead38_realestate@example.com	+91-9222889873	CRED	Chennai	Ad Campaign	a1f32e44-e6a4-4e65-9e20-61f4785eb931	MEETING_SCHEDULED	HOT	110	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #39 for Prime Realty Group	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
bf374d0d-8c55-4e3a-a64f-dcb0131fdf82	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nikhil	Reddy	lead39_realestate@example.com	+91-9150687565	CRED	Mumbai	Event/Expo	df5310ab-9912-4c51-93c7-1c8b9a1b3430	NEW	COLD	10	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #40 for Prime Realty Group	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4aef3215-aab4-4a45-84d6-26d64d932aeb	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nikhil	Nair	lead40_realestate@example.com	+91-9480390758	MindTree	Pune	CSV Import	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	STALE	STALE	83	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #41 for Prime Realty Group	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
0e1b672f-6d87-412c-9f3f-211af3510464	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Isha	Reddy	lead41_realestate@example.com	+91-9477235758	Razorpay	Ahmedabad	CSV Import	df5310ab-9912-4c51-93c7-1c8b9a1b3430	NEGOTIATION	HOT	149	9bcbbac3-88bc-4769-9ff2-e7da4d71adb1	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #42 for Prime Realty Group	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4b5cddbf-922b-4757-8a67-965de7e81bdf	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Anjali	Gupta	lead42_realestate@example.com	+91-9137172046	Zoho	Delhi	Referral	a1f32e44-e6a4-4e65-9e20-61f4785eb931	NEW	COLD	20	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #43 for Prime Realty Group	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
58b80820-3268-4313-99b3-edb612147d34	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Rohan	Mehta	lead43_realestate@example.com	+91-9747260191	TCS	Ahmedabad	Website	df5310ab-9912-4c51-93c7-1c8b9a1b3430	NEW	COLD	32	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #44 for Prime Realty Group	{}	2026-05-08 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
36763bce-4440-4ec2-a199-b6cbe307f688	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Divya	Desai	lead44_realestate@example.com	+91-9330360534	CRED	Chennai	Field Visit	c198bcd7-c8f2-46c6-8006-c6a8e6313155	MEETING_SCHEDULED	HOT	111	9bcbbac3-88bc-4769-9ff2-e7da4d71adb1	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #45 for Prime Realty Group	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
bbdc3cb6-a1ff-4805-976d-91e55d49a02d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Manish	Pandey	lead45_realestate@example.com	+91-9659359039	BYJU's	Delhi	Referral	df5310ab-9912-4c51-93c7-1c8b9a1b3430	LOST	LOST	91	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #46 for Prime Realty Group	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5c517f58-aa4f-452e-a70c-89ddbf6157a2	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Arjun	Bhat	lead46_realestate@example.com	+91-9627418498	MindTree	Mumbai	Ad Campaign	c198bcd7-c8f2-46c6-8006-c6a8e6313155	ENGAGED	HOT	100	9bcbbac3-88bc-4769-9ff2-e7da4d71adb1	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #47 for Prime Realty Group	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5f5d29ff-901a-4c3a-ae88-8bdaaab8f870	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Arjun	Mehta	lead47_realestate@example.com	+91-9858727522	TCS	Mumbai	Ad Campaign	a7d1dd93-030f-4269-b9d6-840aeb49f2c1	ENGAGED	WARM	63	0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #48 for Prime Realty Group	{}	2026-05-03 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
45cc851f-578d-421c-8797-9f37a1d5c477	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nisha	Pandey	lead48_realestate@example.com	+91-9735878790	MindTree	Pune	Field Visit	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	CONVERTED	CONVERTED	55	997e9379-ef00-4201-a1c4-0f1248a3308f	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #49 for Prime Realty Group	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
77d2c232-5893-44b7-a789-432d530c5c44	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Nikhil	Mehta	lead49_realestate@example.com	+91-9205850468	Freshworks	Chennai	Cold Call	16c9e2ac-cbd5-4485-a9ad-3c441a5e7354	ENGAGED	HOT	80	78cc2e55-bd33-4175-ab8f-e16c759b0edf	32970239-a684-4e3d-8a79-ed018d3ea83a	t	f	valid	Lead #50 for Prime Realty Group	{}	2026-05-03 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
230b62c3-9fa7-4b04-9d7b-364e532725fd	41f6cf1a-6695-4163-a5c3-560d519bac96	Arjun	Verma	lead0_construction@example.com	+91-9546658462	Zoho	Kolkata	Event/Expo	b05d33e5-2ad8-4e24-ac54-59462331e279	STALE	STALE	126	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #1 for BuildCraft Construction	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
91a2668c-d902-45c2-b350-1a24c7641d9f	41f6cf1a-6695-4163-a5c3-560d519bac96	Rohan	Agarwal	lead1_construction@example.com	+91-9205408450	Zoho	Pune	Field Visit	b05d33e5-2ad8-4e24-ac54-59462331e279	MEETING_SCHEDULED	HOT	140	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #2 for BuildCraft Construction	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c934cbcf-8265-46f7-a6ab-ce50ee03875a	41f6cf1a-6695-4163-a5c3-560d519bac96	Anjali	Reddy	lead2_construction@example.com	+91-9007298935	Zomato	Ahmedabad	Ad Campaign	db2ef6ba-2001-471d-a027-8f40d749bc06	ENGAGED	WARM	78	b7137009-50c3-4830-8857-a104cfb92ace	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #3 for BuildCraft Construction	{}	2026-05-15 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
db11c31e-fa6d-4c37-942c-ddf7c079fbcf	41f6cf1a-6695-4163-a5c3-560d519bac96	Pooja	Chopra	lead3_construction@example.com	+91-9704327399	Unacademy	Kolkata	CSV Import	ca736aa4-7ae8-4d46-8a37-86ed6e7a6d1f	ACTIVE	WARM	73	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #4 for BuildCraft Construction	{}	2026-05-04 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
0fdea5fa-1be8-4eb9-bd34-f4b76ee278ea	41f6cf1a-6695-4163-a5c3-560d519bac96	Arjun	Mishra	lead4_construction@example.com	+91-9985640105	TCS	Bangalore	CSV Import	b05d33e5-2ad8-4e24-ac54-59462331e279	NEW	COLD	30	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #5 for BuildCraft Construction	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1dccd346-bf75-4d7b-b230-50657e174a6a	41f6cf1a-6695-4163-a5c3-560d519bac96	Nikhil	Kulkarni	lead5_construction@example.com	+91-9146763097	Razorpay	Pune	Referral	db2ef6ba-2001-471d-a027-8f40d749bc06	PROPOSAL_SENT	HOT	80	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #6 for BuildCraft Construction	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5a020388-1e82-4002-b9d8-c4f68a93b17a	41f6cf1a-6695-4163-a5c3-560d519bac96	Ravi	Bhat	lead6_construction@example.com	+91-9385726896	Infosys	Chennai	Cold Call	b05d33e5-2ad8-4e24-ac54-59462331e279	ENGAGED	WARM	74	b7137009-50c3-4830-8857-a104cfb92ace	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #7 for BuildCraft Construction	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5fa77340-a07d-443a-86d9-dc222bae56c8	41f6cf1a-6695-4163-a5c3-560d519bac96	Ananya	Rao	lead7_construction@example.com	+91-9671026861	BYJU's	Bangalore	Field Visit	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	NEGOTIATION	HOT	95	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #8 for BuildCraft Construction	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
0a8af0cf-a79b-4f64-8f0c-04a294b419e3	41f6cf1a-6695-4163-a5c3-560d519bac96	Manish	Menon	lead8_construction@example.com	+91-9011867869	Flipkart	Bangalore	Cold Call	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	NEGOTIATION	HOT	118	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #9 for BuildCraft Construction	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
17c11464-7ac2-4505-816c-378bd2711b3a	41f6cf1a-6695-4163-a5c3-560d519bac96	Aditya	Mishra	lead9_construction@example.com	+91-9564409189	HCL	Pune	Field Visit	4d50bfbb-6da8-4048-ab57-29a0885b5185	NEW	COLD	13	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #10 for BuildCraft Construction	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
309670a4-1ee8-4fa3-ae24-ddb3a23726b3	41f6cf1a-6695-4163-a5c3-560d519bac96	Sneha	Mehta	lead10_construction@example.com	+91-9028669634	Razorpay	Ahmedabad	Event/Expo	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	NEW	COLD	36	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #11 for BuildCraft Construction	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
0adff73e-a315-4d54-b366-9dc5e790e0d1	41f6cf1a-6695-4163-a5c3-560d519bac96	Pooja	Chopra	lead11_construction@example.com	+91-9980060104	Wipro	Hyderabad	Ad Campaign	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	PROPOSAL_SENT	HOT	149	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #12 for BuildCraft Construction	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
7113228c-e54c-478f-875b-3a5200334362	41f6cf1a-6695-4163-a5c3-560d519bac96	Meera	Chopra	lead12_construction@example.com	+91-9050485814	Razorpay	Chennai	CSV Import	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	CONVERTED	CONVERTED	18	b7137009-50c3-4830-8857-a104cfb92ace	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #13 for BuildCraft Construction	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d5f169aa-c547-4fc0-b0f0-6206841b2f2a	41f6cf1a-6695-4163-a5c3-560d519bac96	Arjun	Rao	lead13_construction@example.com	+91-9821934610	BYJU's	Bangalore	Field Visit	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	MEETING_SCHEDULED	HOT	145	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #14 for BuildCraft Construction	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cdec5eb9-43cd-4214-817c-ca1cd215ba15	41f6cf1a-6695-4163-a5c3-560d519bac96	Pooja	Singh	lead14_construction@example.com	+91-9671533899	Infosys	Bangalore	Event/Expo	4d50bfbb-6da8-4048-ab57-29a0885b5185	NEGOTIATION	HOT	136	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #15 for BuildCraft Construction	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ecc650a2-a432-4544-97f3-5e108bb8e024	41f6cf1a-6695-4163-a5c3-560d519bac96	Sneha	Malhotra	lead15_construction@example.com	+91-9489366316	Freshworks	Mumbai	CSV Import	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	LOST	LOST	95	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #16 for BuildCraft Construction	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
63544325-eb0e-4231-aa26-13b4e93ce48d	41f6cf1a-6695-4163-a5c3-560d519bac96	Divya	Nair	lead16_construction@example.com	+91-9693377550	CRED	Kolkata	Ad Campaign	b05d33e5-2ad8-4e24-ac54-59462331e279	NEW	COLD	33	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #17 for BuildCraft Construction	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3b52a12b-a49f-47d3-beb6-4891f6c1d121	41f6cf1a-6695-4163-a5c3-560d519bac96	Karan	Menon	lead17_construction@example.com	+91-9088169902	MindTree	Hyderabad	Ad Campaign	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	MEETING_SCHEDULED	HOT	147	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #18 for BuildCraft Construction	{}	2026-05-03 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
102fba1c-2a94-4bac-9835-3da46165c807	41f6cf1a-6695-4163-a5c3-560d519bac96	Deepak	Mehta	lead18_construction@example.com	+91-9401325813	PhonePe	Ahmedabad	Referral	ca736aa4-7ae8-4d46-8a37-86ed6e7a6d1f	ENGAGED	HOT	100	b7137009-50c3-4830-8857-a104cfb92ace	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #19 for BuildCraft Construction	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f79304b5-6817-4ecc-ac96-d6f092c91ca4	41f6cf1a-6695-4163-a5c3-560d519bac96	Rohan	Joshi	lead19_construction@example.com	+91-9828047968	Zoho	Ahmedabad	Field Visit	ca736aa4-7ae8-4d46-8a37-86ed6e7a6d1f	NEW	COLD	1	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #20 for BuildCraft Construction	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5548de8d-ad72-4220-9a6b-578dc6c55df5	41f6cf1a-6695-4163-a5c3-560d519bac96	Karan	Rao	lead20_construction@example.com	+91-9703623086	Freshworks	Hyderabad	Field Visit	4d50bfbb-6da8-4048-ab57-29a0885b5185	STALE	STALE	14	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #21 for BuildCraft Construction	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5bad6eec-994a-480f-99ba-a5a51b02b324	41f6cf1a-6695-4163-a5c3-560d519bac96	Divya	Pandey	lead21_construction@example.com	+91-9804222575	TCS	Bangalore	CSV Import	ca736aa4-7ae8-4d46-8a37-86ed6e7a6d1f	MEETING_SCHEDULED	HOT	106	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #22 for BuildCraft Construction	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
17fee49c-56f9-4683-b4e9-420d4277b716	41f6cf1a-6695-4163-a5c3-560d519bac96	Divya	Chopra	lead22_construction@example.com	+91-9488635587	Zomato	Delhi	Field Visit	4d50bfbb-6da8-4048-ab57-29a0885b5185	NEW	COLD	32	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #23 for BuildCraft Construction	{}	2026-05-13 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f3c36be5-0653-4f24-8c4a-3b7e5232057b	41f6cf1a-6695-4163-a5c3-560d519bac96	Sneha	Mehta	lead23_construction@example.com	+91-9666318399	Unacademy	Pune	Event/Expo	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	NEW	COLD	4	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #24 for BuildCraft Construction	{}	2026-05-04 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
60b52281-1f79-4f93-af13-f2f9690cdef1	41f6cf1a-6695-4163-a5c3-560d519bac96	Arjun	Nair	lead24_construction@example.com	+91-9642217349	BYJU's	Mumbai	Cold Call	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	CONVERTED	CONVERTED	106	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #25 for BuildCraft Construction	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4c63ae1a-e53c-4111-af79-0884e3721e3c	41f6cf1a-6695-4163-a5c3-560d519bac96	Karan	Shetty	lead25_construction@example.com	+91-9487778630	HCL	Hyderabad	CSV Import	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	NEW	COLD	36	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #26 for BuildCraft Construction	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c9158ee7-727e-413a-908a-b3976c9a0e14	41f6cf1a-6695-4163-a5c3-560d519bac96	Nikhil	Joshi	lead26_construction@example.com	+91-9212952326	Wipro	Delhi	Field Visit	db2ef6ba-2001-471d-a027-8f40d749bc06	NEGOTIATION	HOT	132	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #27 for BuildCraft Construction	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3ef828fb-e6fe-49f5-824d-18a40f392b1f	41f6cf1a-6695-4163-a5c3-560d519bac96	Ananya	Singh	lead27_construction@example.com	+91-9653737875	CRED	Hyderabad	Referral	b05d33e5-2ad8-4e24-ac54-59462331e279	NEW	COLD	6	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #28 for BuildCraft Construction	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b495c230-70ec-4644-98e0-2cf7ec43e3aa	41f6cf1a-6695-4163-a5c3-560d519bac96	Ananya	Gupta	lead28_construction@example.com	+91-9048981823	CRED	Chennai	Referral	db2ef6ba-2001-471d-a027-8f40d749bc06	ACTIVE	COLD	25	b7137009-50c3-4830-8857-a104cfb92ace	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #29 for BuildCraft Construction	{}	2026-05-04 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1abf4b72-1cd0-458a-bfed-d00664614e93	41f6cf1a-6695-4163-a5c3-560d519bac96	Kavya	Reddy	lead29_construction@example.com	+91-9580435233	HCL	Kolkata	Referral	db2ef6ba-2001-471d-a027-8f40d749bc06	ACTIVE	COLD	7	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #30 for BuildCraft Construction	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4e9bdcb3-39bc-4f0c-af57-2445cb0ab232	41f6cf1a-6695-4163-a5c3-560d519bac96	Kavya	Malhotra	lead30_construction@example.com	+91-9849035357	Swiggy	Pune	Event/Expo	4d50bfbb-6da8-4048-ab57-29a0885b5185	LOST	LOST	128	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #31 for BuildCraft Construction	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
fc115e8d-1691-44c3-b003-bc804d142068	41f6cf1a-6695-4163-a5c3-560d519bac96	Vikram	Kulkarni	lead31_construction@example.com	+91-9545037411	TCS	Ahmedabad	Cold Call	4d50bfbb-6da8-4048-ab57-29a0885b5185	ENGAGED	WARM	52	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #32 for BuildCraft Construction	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4a07dd98-6f4c-4328-9769-119f52834350	41f6cf1a-6695-4163-a5c3-560d519bac96	Vikram	Chopra	lead32_construction@example.com	+91-9686531110	Razorpay	Chennai	Ad Campaign	db2ef6ba-2001-471d-a027-8f40d749bc06	ACTIVE	WARM	67	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #33 for BuildCraft Construction	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
75b657bc-7467-4b5c-a6f8-a04ee7a0a059	41f6cf1a-6695-4163-a5c3-560d519bac96	Anjali	Pandey	lead33_construction@example.com	+91-9544742811	Flipkart	Kolkata	Website	b05d33e5-2ad8-4e24-ac54-59462331e279	PROPOSAL_SENT	HOT	105	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #34 for BuildCraft Construction	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b433834b-9acb-4b0e-911d-79bd34686280	41f6cf1a-6695-4163-a5c3-560d519bac96	Anjali	Nair	lead34_construction@example.com	+91-9202137667	Unacademy	Mumbai	Referral	db2ef6ba-2001-471d-a027-8f40d749bc06	ACTIVE	COLD	38	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #35 for BuildCraft Construction	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ff42897f-fca5-4e1c-af04-c046fb6086b2	41f6cf1a-6695-4163-a5c3-560d519bac96	Kavya	Nair	lead35_construction@example.com	+91-9494391704	HCL	Hyderabad	Referral	b05d33e5-2ad8-4e24-ac54-59462331e279	NEGOTIATION	HOT	91	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #36 for BuildCraft Construction	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
492bf5d2-c229-4716-9db9-6cc43a2b481c	41f6cf1a-6695-4163-a5c3-560d519bac96	Ravi	Reddy	lead36_construction@example.com	+91-9049738390	TCS	Chennai	Event/Expo	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	CONVERTED	CONVERTED	31	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #37 for BuildCraft Construction	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ba362701-60f4-4fef-8ec3-6af3c79d0d0f	41f6cf1a-6695-4163-a5c3-560d519bac96	Nisha	Nair	lead37_construction@example.com	+91-9408262444	HCL	Delhi	Referral	b05d33e5-2ad8-4e24-ac54-59462331e279	NEW	COLD	36	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #38 for BuildCraft Construction	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a5a0c20f-57f2-4d16-810f-f8743a2167af	41f6cf1a-6695-4163-a5c3-560d519bac96	Manish	Reddy	lead38_construction@example.com	+91-9136501615	Wipro	Pune	Referral	b05d33e5-2ad8-4e24-ac54-59462331e279	PROPOSAL_SENT	HOT	127	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #39 for BuildCraft Construction	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
69bbf74d-0767-4926-8c6b-8de73501d8f4	41f6cf1a-6695-4163-a5c3-560d519bac96	Nisha	Shetty	lead39_construction@example.com	+91-9298609389	Infosys	Bangalore	Referral	ca736aa4-7ae8-4d46-8a37-86ed6e7a6d1f	ENGAGED	WARM	67	b7137009-50c3-4830-8857-a104cfb92ace	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #40 for BuildCraft Construction	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
7ca1a321-e138-4326-b8cd-825998edd5c2	41f6cf1a-6695-4163-a5c3-560d519bac96	Karan	Shetty	lead40_construction@example.com	+91-9020327193	Freshworks	Bangalore	Field Visit	b05d33e5-2ad8-4e24-ac54-59462331e279	STALE	STALE	92	b7137009-50c3-4830-8857-a104cfb92ace	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #41 for BuildCraft Construction	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d11522fb-c181-4cc1-ad08-4115858322cd	41f6cf1a-6695-4163-a5c3-560d519bac96	Divya	Kulkarni	lead41_construction@example.com	+91-9468192006	Zomato	Kolkata	Referral	4d50bfbb-6da8-4048-ab57-29a0885b5185	ACTIVE	COLD	39	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #42 for BuildCraft Construction	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
35d675d7-f45e-4972-86a2-07d706327892	41f6cf1a-6695-4163-a5c3-560d519bac96	Aditya	Agarwal	lead42_construction@example.com	+91-9508292919	Zoho	Mumbai	Website	ca736aa4-7ae8-4d46-8a37-86ed6e7a6d1f	ACTIVE	WARM	72	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #43 for BuildCraft Construction	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
008eb93e-4236-4932-8246-25556731d2cd	41f6cf1a-6695-4163-a5c3-560d519bac96	Ananya	Gupta	lead43_construction@example.com	+91-9036805551	HCL	Kolkata	Event/Expo	4d50bfbb-6da8-4048-ab57-29a0885b5185	ACTIVE	COLD	15	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #44 for BuildCraft Construction	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d0bb0dec-733b-4e89-ba7f-0c13bedd37f6	41f6cf1a-6695-4163-a5c3-560d519bac96	Aditya	Chopra	lead44_construction@example.com	+91-9008709377	MindTree	Hyderabad	Website	4d50bfbb-6da8-4048-ab57-29a0885b5185	ACTIVE	WARM	63	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #45 for BuildCraft Construction	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c2a012f7-b03f-4f00-901a-1494ca2c4846	41f6cf1a-6695-4163-a5c3-560d519bac96	Meera	Mehta	lead45_construction@example.com	+91-9284715208	MindTree	Mumbai	CSV Import	4d50bfbb-6da8-4048-ab57-29a0885b5185	LOST	LOST	132	73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #46 for BuildCraft Construction	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4c9298d6-47e8-4a25-ab05-ed98afc9a0a6	41f6cf1a-6695-4163-a5c3-560d519bac96	Meera	Iyer	lead46_construction@example.com	+91-9218349098	CRED	Delhi	Referral	b05d33e5-2ad8-4e24-ac54-59462331e279	ACTIVE	COLD	13	c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #47 for BuildCraft Construction	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b597a914-8d54-43f6-a260-9fcd0b9bddb2	41f6cf1a-6695-4163-a5c3-560d519bac96	Deepak	Gupta	lead47_construction@example.com	+91-9963878774	Unacademy	Mumbai	Website	b05d33e5-2ad8-4e24-ac54-59462331e279	MEETING_SCHEDULED	HOT	149	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #48 for BuildCraft Construction	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
29e8639e-f704-4f9a-9561-901a5fa48be1	41f6cf1a-6695-4163-a5c3-560d519bac96	Pooja	Malhotra	lead48_construction@example.com	+91-9330900321	CRED	Mumbai	Ad Campaign	0d6c0147-e6f1-4a48-aa2f-fa3c118d6e5e	CONVERTED	CONVERTED	53	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #49 for BuildCraft Construction	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
17660add-a0b1-463b-8ec5-21c4a5ccde4f	41f6cf1a-6695-4163-a5c3-560d519bac96	Sneha	Malhotra	lead49_construction@example.com	+91-9193196829	BYJU's	Mumbai	Referral	db2ef6ba-2001-471d-a027-8f40d749bc06	MEETING_SCHEDULED	HOT	113	99da393e-4325-43a7-80fe-94bc069e268e	71f133b4-bb09-4017-97e0-c1028965b94b	t	f	valid	Lead #50 for BuildCraft Construction	{}	2026-04-30 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
785ba25e-217b-4e7a-8118-46feeb230278	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nisha	Iyer	lead0_itservices@example.com	+91-9596727161	HCL	Chennai	Cold Call	493404d6-69c1-40f3-bc76-dc38add25fd9	STALE	STALE	118	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #1 for TechNova IT Solutions	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
56ce865a-cabb-4079-ba67-c291e8f4a947	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Kavya	Shah	lead1_itservices@example.com	+91-9291442744	Razorpay	Hyderabad	Event/Expo	493404d6-69c1-40f3-bc76-dc38add25fd9	ACTIVE	WARM	69	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #2 for TechNova IT Solutions	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
410b6749-fd63-49fa-b0cd-1d0e9a2676a9	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Anjali	Mehta	lead2_itservices@example.com	+91-9829877279	BYJU's	Kolkata	Ad Campaign	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	ENGAGED	WARM	78	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #3 for TechNova IT Solutions	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
05b45b04-4b68-409b-9e60-39b17328c96e	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Aditya	Menon	lead3_itservices@example.com	+91-9024278347	BYJU's	Pune	Cold Call	493404d6-69c1-40f3-bc76-dc38add25fd9	NEW	COLD	22	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #4 for TechNova IT Solutions	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6bc13e54-ac7a-49cc-ab13-5f72e7043bfb	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Kavya	Joshi	lead4_itservices@example.com	+91-9539270736	Freshworks	Bangalore	Field Visit	8e357aae-07d4-4fa4-9ca1-83368663eeb0	MEETING_SCHEDULED	HOT	93	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #5 for TechNova IT Solutions	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6db3f5e6-9e20-4231-9697-1c305640e074	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Arjun	Malhotra	lead5_itservices@example.com	+91-9787630996	MindTree	Hyderabad	CSV Import	493404d6-69c1-40f3-bc76-dc38add25fd9	MEETING_SCHEDULED	HOT	139	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #6 for TechNova IT Solutions	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
8b401f81-6494-42cf-b800-e56f6835f9c4	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Siddharth	Verma	lead6_itservices@example.com	+91-9218449178	Freshworks	Pune	Referral	9680c660-9446-42c6-b92c-a103dc9f807b	NEGOTIATION	HOT	128	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #7 for TechNova IT Solutions	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cd03bac1-efc2-4341-83be-5f26673b5dc7	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Anjali	Rao	lead7_itservices@example.com	+91-9119205123	BYJU's	Mumbai	Event/Expo	493404d6-69c1-40f3-bc76-dc38add25fd9	ACTIVE	WARM	70	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #8 for TechNova IT Solutions	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
8d4a9d87-28b1-4465-8888-951cef9cbf26	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Isha	Kulkarni	lead8_itservices@example.com	+91-9029383091	MindTree	Chennai	Website	351da80f-1b8f-490e-b3db-0702c02ddf05	ACTIVE	WARM	42	31688bb9-b854-44dd-a367-0c23ae743840	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #9 for TechNova IT Solutions	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
21f0967a-84d2-4719-a6b5-a5052984424c	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Meera	Joshi	lead9_itservices@example.com	+91-9180877732	Freshworks	Ahmedabad	Cold Call	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	ACTIVE	COLD	21	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #10 for TechNova IT Solutions	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
21485740-080d-4c50-8757-53db00d9976f	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Kavya	Desai	lead10_itservices@example.com	+91-9476999125	Unacademy	Hyderabad	Event/Expo	351da80f-1b8f-490e-b3db-0702c02ddf05	ACTIVE	WARM	64	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #11 for TechNova IT Solutions	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
479161eb-ba19-4dd6-a21d-9592ae07b223	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Pooja	Gupta	lead11_itservices@example.com	+91-9854582308	BYJU's	Pune	Field Visit	8e357aae-07d4-4fa4-9ca1-83368663eeb0	ACTIVE	WARM	42	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #12 for TechNova IT Solutions	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
2f687cb7-69fa-4797-805a-bd36e67927d8	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ravi	Mishra	lead12_itservices@example.com	+91-9088506607	Zomato	Mumbai	Ad Campaign	351da80f-1b8f-490e-b3db-0702c02ddf05	CONVERTED	CONVERTED	40	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #13 for TechNova IT Solutions	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d6efc833-eced-43a6-b1ee-a129521477a8	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Pooja	Kulkarni	lead13_itservices@example.com	+91-9614771730	Swiggy	Pune	Event/Expo	8e357aae-07d4-4fa4-9ca1-83368663eeb0	ACTIVE	WARM	53	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #14 for TechNova IT Solutions	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
bf56d68a-a5df-4ace-92e3-c42594b35617	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ravi	Reddy	lead14_itservices@example.com	+91-9533293772	Flipkart	Ahmedabad	Field Visit	8e357aae-07d4-4fa4-9ca1-83368663eeb0	MEETING_SCHEDULED	HOT	94	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #15 for TechNova IT Solutions	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9122ddea-048b-4a07-9901-1d6d1a563a9d	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Swati	Gupta	lead15_itservices@example.com	+91-9743251355	PhonePe	Ahmedabad	Website	9680c660-9446-42c6-b92c-a103dc9f807b	LOST	LOST	80	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #16 for TechNova IT Solutions	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5b34146a-b909-4ffd-89c7-2820e13abe48	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Kavya	Iyer	lead16_itservices@example.com	+91-9222328912	PhonePe	Pune	Cold Call	493404d6-69c1-40f3-bc76-dc38add25fd9	ACTIVE	COLD	1	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #17 for TechNova IT Solutions	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d4855df6-9d34-4bf8-8ce1-e14cde3f26f7	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Arjun	Reddy	lead17_itservices@example.com	+91-9408885977	HCL	Delhi	Referral	493404d6-69c1-40f3-bc76-dc38add25fd9	NEW	COLD	19	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #18 for TechNova IT Solutions	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c24d704b-029c-407a-ab36-15bf6b4b239b	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nisha	Rao	lead18_itservices@example.com	+91-9486571326	MindTree	Hyderabad	Website	351da80f-1b8f-490e-b3db-0702c02ddf05	NEW	COLD	8	31688bb9-b854-44dd-a367-0c23ae743840	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #19 for TechNova IT Solutions	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3624487e-4fb0-44cd-978c-4c3915373d40	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Aditya	Nair	lead19_itservices@example.com	+91-9249267980	BYJU's	Chennai	Event/Expo	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	ACTIVE	WARM	68	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #20 for TechNova IT Solutions	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
773981aa-bdd7-4dc9-9bb3-9401a630c8dc	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nikhil	Verma	lead20_itservices@example.com	+91-9894410300	Zoho	Kolkata	Referral	351da80f-1b8f-490e-b3db-0702c02ddf05	STALE	STALE	121	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #21 for TechNova IT Solutions	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
512829a2-05fe-4763-8735-d0ed21b6dceb	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Sneha	Agarwal	lead21_itservices@example.com	+91-9281077211	Wipro	Hyderabad	Referral	9680c660-9446-42c6-b92c-a103dc9f807b	ENGAGED	WARM	44	31688bb9-b854-44dd-a367-0c23ae743840	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #22 for TechNova IT Solutions	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e06f4a57-1ba9-41ad-911c-eabff590a660	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Rohan	Menon	lead22_itservices@example.com	+91-9698551231	Infosys	Chennai	Website	8e357aae-07d4-4fa4-9ca1-83368663eeb0	PROPOSAL_SENT	HOT	109	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #23 for TechNova IT Solutions	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
92c1d1e7-2090-459e-9433-f0d6e6f79f93	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nisha	Malhotra	lead23_itservices@example.com	+91-9902985487	Wipro	Ahmedabad	Website	9680c660-9446-42c6-b92c-a103dc9f807b	ENGAGED	WARM	46	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #24 for TechNova IT Solutions	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ddf56f6e-540c-440d-8e27-936cb0890805	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nisha	Singh	lead24_itservices@example.com	+91-9271295029	Infosys	Chennai	Ad Campaign	493404d6-69c1-40f3-bc76-dc38add25fd9	CONVERTED	CONVERTED	66	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #25 for TechNova IT Solutions	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
7be8c12d-6554-4492-90b5-f29c565e35c9	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ravi	Malhotra	lead25_itservices@example.com	+91-9023918976	Zomato	Bangalore	Cold Call	351da80f-1b8f-490e-b3db-0702c02ddf05	ENGAGED	HOT	109	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #26 for TechNova IT Solutions	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ae6bd662-7ee0-41c1-997f-d3c27f88cd03	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ravi	Agarwal	lead26_itservices@example.com	+91-9772803870	CRED	Hyderabad	Ad Campaign	493404d6-69c1-40f3-bc76-dc38add25fd9	NEGOTIATION	HOT	127	31688bb9-b854-44dd-a367-0c23ae743840	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #27 for TechNova IT Solutions	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ee38845a-7e82-4af3-9093-914b72a7fdd3	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Karan	Desai	lead27_itservices@example.com	+91-9456952874	Swiggy	Ahmedabad	CSV Import	8e357aae-07d4-4fa4-9ca1-83368663eeb0	ACTIVE	COLD	23	31688bb9-b854-44dd-a367-0c23ae743840	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #28 for TechNova IT Solutions	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
142e011c-c9bf-4b9b-ba2f-aa380cd63c34	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Arjun	Verma	lead28_itservices@example.com	+91-9428544212	Wipro	Ahmedabad	CSV Import	8e357aae-07d4-4fa4-9ca1-83368663eeb0	PROPOSAL_SENT	HOT	122	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #29 for TechNova IT Solutions	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9c2cc1b4-1aa8-42c3-87ab-4f183a5e9c7f	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nisha	Mehta	lead29_itservices@example.com	+91-9721758625	TCS	Delhi	Field Visit	8e357aae-07d4-4fa4-9ca1-83368663eeb0	NEGOTIATION	HOT	134	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #30 for TechNova IT Solutions	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b46417e1-baf3-46eb-92be-aa88adf92e07	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ravi	Iyer	lead30_itservices@example.com	+91-9778642297	Swiggy	Hyderabad	CSV Import	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	LOST	LOST	97	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #31 for TechNova IT Solutions	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e1039309-31f0-4305-b346-fb8ea83d05fe	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Arjun	Malhotra	lead31_itservices@example.com	+91-9264381309	Zoho	Ahmedabad	Referral	351da80f-1b8f-490e-b3db-0702c02ddf05	ENGAGED	WARM	45	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #32 for TechNova IT Solutions	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
27236e18-32ad-4a67-ae6e-ba83ff6a7415	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Siddharth	Verma	lead32_itservices@example.com	+91-9494652128	HCL	Chennai	CSV Import	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	ACTIVE	COLD	33	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #33 for TechNova IT Solutions	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1f2aeba3-482d-43f5-bd7e-3eec72ef62e8	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ananya	Iyer	lead33_itservices@example.com	+91-9484538476	BYJU's	Ahmedabad	Website	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	NEW	COLD	13	31688bb9-b854-44dd-a367-0c23ae743840	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #34 for TechNova IT Solutions	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9c83c2de-0ef7-4d2e-a202-83c38ea8abf2	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nisha	Menon	lead34_itservices@example.com	+91-9810198224	HCL	Pune	Cold Call	351da80f-1b8f-490e-b3db-0702c02ddf05	ENGAGED	WARM	62	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #35 for TechNova IT Solutions	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f688dcb3-be31-4392-91b5-c66726eec425	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Manish	Joshi	lead35_itservices@example.com	+91-9654879853	CRED	Kolkata	Cold Call	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	ENGAGED	HOT	86	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #36 for TechNova IT Solutions	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
35285a83-5c10-4795-9af6-4793e5a0508a	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nikhil	Iyer	lead36_itservices@example.com	+91-9496080832	TCS	Chennai	Referral	351da80f-1b8f-490e-b3db-0702c02ddf05	CONVERTED	CONVERTED	145	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #37 for TechNova IT Solutions	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4e0f90a8-494f-47f8-8213-a8f8ea98f1c6	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ananya	Mehta	lead37_itservices@example.com	+91-9710612734	PhonePe	Kolkata	CSV Import	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	NEGOTIATION	HOT	98	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #38 for TechNova IT Solutions	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4e09460f-375f-4324-9ebf-f06715dadbf2	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Kavya	Chopra	lead38_itservices@example.com	+91-9854629931	BYJU's	Ahmedabad	Cold Call	351da80f-1b8f-490e-b3db-0702c02ddf05	ENGAGED	WARM	48	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #39 for TechNova IT Solutions	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
467bb246-881c-4a11-91a5-68271da7b0b0	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Sneha	Malhotra	lead39_itservices@example.com	+91-9367269400	Flipkart	Delhi	Referral	9680c660-9446-42c6-b92c-a103dc9f807b	ACTIVE	WARM	41	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #40 for TechNova IT Solutions	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
965a0679-aeb4-495e-8d71-5d3fc87305b0	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Vikram	Gupta	lead40_itservices@example.com	+91-9054509882	MindTree	Chennai	Ad Campaign	493404d6-69c1-40f3-bc76-dc38add25fd9	STALE	STALE	110	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #41 for TechNova IT Solutions	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a78d5345-e903-41cd-ba2d-ca80b4dd96bd	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Manish	Malhotra	lead41_itservices@example.com	+91-9576670412	PhonePe	Kolkata	Ad Campaign	9680c660-9446-42c6-b92c-a103dc9f807b	ACTIVE	WARM	53	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #42 for TechNova IT Solutions	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3b5bd33d-b37b-4f47-b2c5-8ade432a48c3	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Isha	Mishra	lead42_itservices@example.com	+91-9668931450	HCL	Ahmedabad	Event/Expo	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	ENGAGED	HOT	119	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #43 for TechNova IT Solutions	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1955b576-74e2-41e7-aa7e-8aafad87e245	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Nikhil	Verma	lead43_itservices@example.com	+91-9420037260	Swiggy	Ahmedabad	CSV Import	351da80f-1b8f-490e-b3db-0702c02ddf05	ACTIVE	WARM	79	31688bb9-b854-44dd-a367-0c23ae743840	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #44 for TechNova IT Solutions	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
361bb71e-7c69-4d9c-a01f-21ec4c41a89a	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Anjali	Gupta	lead44_itservices@example.com	+91-9448499301	Swiggy	Kolkata	Event/Expo	8e357aae-07d4-4fa4-9ca1-83368663eeb0	NEW	COLD	26	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #45 for TechNova IT Solutions	{}	2026-04-30 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4f114f2f-3204-49d6-bbc1-2d91354b1f0c	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ravi	Pandey	lead45_itservices@example.com	+91-9671961041	Wipro	Hyderabad	Ad Campaign	493404d6-69c1-40f3-bc76-dc38add25fd9	LOST	LOST	64	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #46 for TechNova IT Solutions	{}	2026-05-03 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f4996bcc-c047-4c46-8bae-6aaecf74e6db	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Deepak	Mehta	lead46_itservices@example.com	+91-9491581067	CRED	Ahmedabad	Field Visit	6ac9f961-bd03-4ea4-9c92-8b55d0a23016	MEETING_SCHEDULED	HOT	137	83d2e135-26eb-4dc7-88e7-82847bb6b872	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #47 for TechNova IT Solutions	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4ea04274-5fdb-4a0f-8bd0-e5a96401378c	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Aditya	Iyer	lead47_itservices@example.com	+91-9597505892	Zomato	Hyderabad	Field Visit	351da80f-1b8f-490e-b3db-0702c02ddf05	ENGAGED	HOT	119	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #48 for TechNova IT Solutions	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
de905b90-5c47-4ab3-8021-0d6242323466	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ananya	Shah	lead48_itservices@example.com	+91-9123310156	TCS	Delhi	Website	351da80f-1b8f-490e-b3db-0702c02ddf05	CONVERTED	CONVERTED	80	16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #49 for TechNova IT Solutions	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b5371b01-ce7a-4411-b618-305c9ed499dd	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Ananya	Mishra	lead49_itservices@example.com	+91-9483112065	Zoho	Chennai	Cold Call	493404d6-69c1-40f3-bc76-dc38add25fd9	NEW	COLD	12	27a52843-fa9c-46e3-8484-acdd16c10942	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	t	f	valid	Lead #50 for TechNova IT Solutions	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5f768c70-187d-43d8-a460-9f9c1cf44ac4	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Deepak	Menon	lead0_autoparts@example.com	+91-9851577280	TCS	Chennai	Website	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	STALE	STALE	110	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #1 for AutoParts Express	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d75cbc34-45f4-4bd6-bec2-1b6767560b60	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Ravi	Gupta	lead1_autoparts@example.com	+91-9429218508	MindTree	Ahmedabad	Event/Expo	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	ENGAGED	HOT	86	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #2 for AutoParts Express	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a48df498-6fa7-46cc-8420-edd4019d9d9b	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Rohan	Malhotra	lead2_autoparts@example.com	+91-9623253676	PhonePe	Hyderabad	Field Visit	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	ACTIVE	WARM	42	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #3 for AutoParts Express	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a305fce4-33f8-480f-9c75-03438964b300	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Arjun	Malhotra	lead3_autoparts@example.com	+91-9423838866	HCL	Ahmedabad	Cold Call	394894dd-aad4-422f-afb6-7e5018cf757e	NEW	COLD	6	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #4 for AutoParts Express	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1649062a-0680-4124-9874-4d2b31da9db5	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Deepak	Rao	lead4_autoparts@example.com	+91-9745660759	Razorpay	Mumbai	Field Visit	394894dd-aad4-422f-afb6-7e5018cf757e	ENGAGED	WARM	73	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #5 for AutoParts Express	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4cee9c79-b0e3-4a18-a4e6-4ab05ae86b87	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Rohan	Mehta	lead5_autoparts@example.com	+91-9948721591	Unacademy	Pune	Ad Campaign	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	PROPOSAL_SENT	HOT	121	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #6 for AutoParts Express	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b68717f2-ab05-4ca7-be10-e2c2ab3bfe33	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Manish	Shetty	lead6_autoparts@example.com	+91-9736247987	MindTree	Mumbai	Ad Campaign	b31bac55-2903-4b12-bfd5-bb18b7025243	NEW	COLD	18	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #7 for AutoParts Express	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
bd41588b-f73c-4ab2-a1f2-27f9aa8cb35c	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Arjun	Mishra	lead7_autoparts@example.com	+91-9234521597	TCS	Mumbai	Event/Expo	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	NEGOTIATION	HOT	135	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #8 for AutoParts Express	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c046535f-25be-4f4f-9785-c6fd57a2c150	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Pooja	Reddy	lead8_autoparts@example.com	+91-9933879796	HCL	Delhi	Ad Campaign	361c5f53-1d61-4727-a9a2-b00bb90e7eb1	PROPOSAL_SENT	HOT	85	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #9 for AutoParts Express	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
dc7aa924-b5ec-404d-a0ab-ed1e6409df01	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Siddharth	Kulkarni	lead9_autoparts@example.com	+91-9767727225	Unacademy	Ahmedabad	Referral	394894dd-aad4-422f-afb6-7e5018cf757e	ENGAGED	WARM	45	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #10 for AutoParts Express	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
234b6250-a37a-40cd-9689-eae407c24570	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Anjali	Reddy	lead10_autoparts@example.com	+91-9378078525	PhonePe	Pune	Event/Expo	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	MEETING_SCHEDULED	HOT	141	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #11 for AutoParts Express	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3b3ca458-7a78-4c55-bbe9-c948f5d1b301	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Karan	Mehta	lead11_autoparts@example.com	+91-9872239251	Swiggy	Hyderabad	Website	361c5f53-1d61-4727-a9a2-b00bb90e7eb1	NEGOTIATION	HOT	100	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #12 for AutoParts Express	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e2e19cb1-4652-4155-accd-bac65bc76aae	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Ananya	Kulkarni	lead12_autoparts@example.com	+91-9616856266	HCL	Mumbai	Field Visit	b31bac55-2903-4b12-bfd5-bb18b7025243	CONVERTED	CONVERTED	60	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #13 for AutoParts Express	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
598c30d1-5851-423f-b2ea-995521c0a5bb	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Siddharth	Bhat	lead13_autoparts@example.com	+91-9770241260	Zomato	Delhi	Field Visit	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	ENGAGED	WARM	67	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #14 for AutoParts Express	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cbee6e32-10a1-4267-b038-32a7d2ce358b	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Nisha	Kulkarni	lead14_autoparts@example.com	+91-9063450625	Freshworks	Hyderabad	Ad Campaign	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	MEETING_SCHEDULED	HOT	128	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #15 for AutoParts Express	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b527c509-7032-4013-9d6d-ef67d3428fdb	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Meera	Shetty	lead15_autoparts@example.com	+91-9681247878	Flipkart	Kolkata	Field Visit	394894dd-aad4-422f-afb6-7e5018cf757e	LOST	LOST	60	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #16 for AutoParts Express	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e944fc17-7a15-47b5-9aed-a87ad0c5ca16	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Arjun	Pandey	lead16_autoparts@example.com	+91-9532478483	Razorpay	Bangalore	CSV Import	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	NEW	COLD	39	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #17 for AutoParts Express	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a66db57b-189e-41e2-b429-0b7519d099b4	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Nikhil	Bhat	lead17_autoparts@example.com	+91-9475505650	TCS	Delhi	Referral	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	MEETING_SCHEDULED	HOT	100	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #18 for AutoParts Express	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5c67c211-b1d8-4797-a222-81ba6caeef42	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Isha	Desai	lead18_autoparts@example.com	+91-9978079288	Zomato	Delhi	Cold Call	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	NEW	COLD	29	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #19 for AutoParts Express	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
22b02582-5359-47e7-bb43-5272fc87692b	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Divya	Verma	lead19_autoparts@example.com	+91-9125300511	Razorpay	Ahmedabad	Website	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	MEETING_SCHEDULED	HOT	144	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #20 for AutoParts Express	{}	2026-05-01 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ae7a8029-161e-440b-9425-aaedd4a626fa	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Swati	Gupta	lead20_autoparts@example.com	+91-9196612329	Razorpay	Ahmedabad	Cold Call	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	STALE	STALE	122	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #21 for AutoParts Express	{}	2026-05-08 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
58c425fc-a7e9-4d50-a9e0-d7ac7e63015a	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Siddharth	Iyer	lead21_autoparts@example.com	+91-9995687852	Wipro	Chennai	Event/Expo	394894dd-aad4-422f-afb6-7e5018cf757e	PROPOSAL_SENT	HOT	99	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #22 for AutoParts Express	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
401cc5ed-9325-4881-b06d-ba9b3a7289c3	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Nisha	Desai	lead22_autoparts@example.com	+91-9864042667	MindTree	Kolkata	Ad Campaign	394894dd-aad4-422f-afb6-7e5018cf757e	PROPOSAL_SENT	HOT	101	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #23 for AutoParts Express	{}	2026-05-15 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
678a735f-c6dc-48b3-acc9-75c54ddf8514	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Manish	Shah	lead23_autoparts@example.com	+91-9743311474	Wipro	Delhi	Field Visit	394894dd-aad4-422f-afb6-7e5018cf757e	MEETING_SCHEDULED	HOT	83	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #24 for AutoParts Express	{}	2026-05-26 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f58ec7a9-d763-4782-8348-47a557b3d935	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Swati	Desai	lead24_autoparts@example.com	+91-9158740210	MindTree	Chennai	Website	394894dd-aad4-422f-afb6-7e5018cf757e	CONVERTED	CONVERTED	96	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #25 for AutoParts Express	{}	2026-04-28 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
802bb453-3b05-4471-87e0-61b657b27723	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Divya	Joshi	lead25_autoparts@example.com	+91-9480850302	Zoho	Mumbai	Website	394894dd-aad4-422f-afb6-7e5018cf757e	NEW	COLD	38	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #26 for AutoParts Express	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c6c0e989-71b7-482f-9874-4ef47d9ddae1	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Siddharth	Bhat	lead26_autoparts@example.com	+91-9312025608	Unacademy	Pune	CSV Import	b31bac55-2903-4b12-bfd5-bb18b7025243	ENGAGED	WARM	59	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #27 for AutoParts Express	{}	2026-05-15 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ccf7d876-2a86-452d-8cd1-6e17ae70bcca	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Divya	Singh	lead27_autoparts@example.com	+91-9990405331	TCS	Ahmedabad	Ad Campaign	394894dd-aad4-422f-afb6-7e5018cf757e	MEETING_SCHEDULED	HOT	139	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #28 for AutoParts Express	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cfef7e2d-0d2d-43cc-8dc3-f9f07a9f54bd	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Ananya	Mishra	lead28_autoparts@example.com	+91-9093065599	BYJU's	Pune	Field Visit	361c5f53-1d61-4727-a9a2-b00bb90e7eb1	MEETING_SCHEDULED	HOT	87	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #29 for AutoParts Express	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5e11b189-2e9e-4dbb-864b-a76aa2cb7d19	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Meera	Singh	lead29_autoparts@example.com	+91-9241072687	Zomato	Bangalore	Website	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	ENGAGED	HOT	139	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #30 for AutoParts Express	{}	2026-04-30 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ba95cb1d-f796-43c8-b554-f1f1980233c9	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Nisha	Gupta	lead30_autoparts@example.com	+91-9272514536	MindTree	Pune	Referral	b31bac55-2903-4b12-bfd5-bb18b7025243	LOST	LOST	131	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #31 for AutoParts Express	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
61516f68-8224-43ec-a013-626f721f9ef5	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Meera	Kulkarni	lead31_autoparts@example.com	+91-9180663205	PhonePe	Ahmedabad	Website	394894dd-aad4-422f-afb6-7e5018cf757e	ENGAGED	WARM	46	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #32 for AutoParts Express	{}	2026-05-16 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
afad5527-a128-45a2-aace-c1aaa5d64afd	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Deepak	Iyer	lead32_autoparts@example.com	+91-9358528128	Freshworks	Bangalore	Field Visit	394894dd-aad4-422f-afb6-7e5018cf757e	MEETING_SCHEDULED	HOT	87	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #33 for AutoParts Express	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f3cc5a51-9368-4032-88b8-7e535f960fcd	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Arjun	Rao	lead33_autoparts@example.com	+91-9720300807	TCS	Bangalore	Event/Expo	361c5f53-1d61-4727-a9a2-b00bb90e7eb1	MEETING_SCHEDULED	HOT	126	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #34 for AutoParts Express	{}	2026-04-30 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6c34ed1f-7c7c-4029-a92c-8e6a6f05b887	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Nisha	Verma	lead34_autoparts@example.com	+91-9707361756	Zomato	Hyderabad	Website	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	PROPOSAL_SENT	HOT	133	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #35 for AutoParts Express	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
7855c7de-ff3b-40fb-9b5b-1b173ac0dd50	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Siddharth	Reddy	lead35_autoparts@example.com	+91-9936446673	Swiggy	Mumbai	Event/Expo	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	PROPOSAL_SENT	HOT	108	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #36 for AutoParts Express	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a304b64f-e715-44c9-8b8b-19292c79b637	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Arjun	Rao	lead36_autoparts@example.com	+91-9886645250	MindTree	Delhi	Field Visit	394894dd-aad4-422f-afb6-7e5018cf757e	CONVERTED	CONVERTED	69	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #37 for AutoParts Express	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
85dfaaae-7ef4-422d-bde4-0568fc2dc673	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Ravi	Singh	lead37_autoparts@example.com	+91-9773808656	Razorpay	Ahmedabad	CSV Import	394894dd-aad4-422f-afb6-7e5018cf757e	ENGAGED	HOT	120	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #38 for AutoParts Express	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
0199afa6-9c50-4e87-8168-80d74959a15b	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Nisha	Mehta	lead38_autoparts@example.com	+91-9481156104	TCS	Hyderabad	Event/Expo	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	ENGAGED	HOT	88	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #39 for AutoParts Express	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
784edcfc-0fb6-4c04-a554-cad8e7b778dd	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Ananya	Reddy	lead39_autoparts@example.com	+91-9895815242	Freshworks	Kolkata	CSV Import	361c5f53-1d61-4727-a9a2-b00bb90e7eb1	MEETING_SCHEDULED	HOT	146	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #40 for AutoParts Express	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
78bdc6c0-0850-453f-8214-a0687af11852	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Aditya	Kulkarni	lead40_autoparts@example.com	+91-9390246599	Infosys	Pune	Website	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	STALE	STALE	146	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #41 for AutoParts Express	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f03fb92b-8b6c-4428-a639-df502896e2ad	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Anjali	Malhotra	lead41_autoparts@example.com	+91-9475733595	Razorpay	Delhi	Referral	394894dd-aad4-422f-afb6-7e5018cf757e	NEGOTIATION	HOT	109	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #42 for AutoParts Express	{}	2026-05-17 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
1e128cb3-dc75-4aa1-8a38-01ae9addd4aa	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Divya	Shah	lead42_autoparts@example.com	+91-9417266639	PhonePe	Pune	CSV Import	8bd3f58d-3fdb-4ef5-95e9-a61a50949fc7	ENGAGED	WARM	42	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #43 for AutoParts Express	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
93810f3f-fddf-4cf7-b52a-7e0df6140eee	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Karan	Verma	lead43_autoparts@example.com	+91-9381554394	Flipkart	Ahmedabad	Cold Call	394894dd-aad4-422f-afb6-7e5018cf757e	NEW	COLD	14	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #44 for AutoParts Express	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
52e37bca-744e-4a5e-88b4-1ebd8b68a450	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Arjun	Reddy	lead44_autoparts@example.com	+91-9031996400	TCS	Ahmedabad	Ad Campaign	394894dd-aad4-422f-afb6-7e5018cf757e	ACTIVE	WARM	43	cad53572-0214-411a-b424-ff44af446154	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #45 for AutoParts Express	{}	2026-05-18 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
84fcc801-0781-480d-b0f7-8916ccf0317a	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Isha	Shah	lead45_autoparts@example.com	+91-9187576943	PhonePe	Kolkata	Cold Call	394894dd-aad4-422f-afb6-7e5018cf757e	LOST	LOST	146	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #46 for AutoParts Express	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
0d944159-17de-435b-8662-4afd4925c21b	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Kavya	Kulkarni	lead46_autoparts@example.com	+91-9132597671	BYJU's	Ahmedabad	Field Visit	361c5f53-1d61-4727-a9a2-b00bb90e7eb1	ENGAGED	HOT	108	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #47 for AutoParts Express	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9451a865-ec52-494b-abcd-f98118c1aa06	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Meera	Mehta	lead47_autoparts@example.com	+91-9049435286	Flipkart	Bangalore	Website	b31bac55-2903-4b12-bfd5-bb18b7025243	ENGAGED	HOT	96	26a7fef0-3396-473f-8e2b-206de0ae49fa	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #48 for AutoParts Express	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
83c7433c-f7a2-44ff-82e6-9476afef6e08	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Siddharth	Agarwal	lead48_autoparts@example.com	+91-9396324778	Infosys	Ahmedabad	Field Visit	5f0297da-06b3-4b1a-9d1a-004fba6aee7c	CONVERTED	CONVERTED	145	2a7931a8-8ee6-4365-85d0-b40109a3ed68	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #49 for AutoParts Express	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c90ea01f-8c42-4b14-8bd0-70b0a073cfb0	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Siddharth	Chopra	lead49_autoparts@example.com	+91-9121266536	Infosys	Hyderabad	Field Visit	394894dd-aad4-422f-afb6-7e5018cf757e	ENGAGED	WARM	43	0c4d2635-dfdd-4043-8104-14fcdbdd4270	48814013-2438-4831-bf0b-980b5dac7e9c	t	f	valid	Lead #50 for AutoParts Express	{}	2026-05-07 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6742a6ad-1b1c-4456-9d92-709dd12334f6	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Pooja	Shah	lead0_iotaqi@example.com	+91-9722055359	Freshworks	Mumbai	Referral	e2e6d382-7c84-43ba-be48-fb206fd4c3b8	STALE	STALE	83	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #1 for CleanAir IoT	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
dbea7843-be21-43b6-b8b6-8c46972f87f2	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Ravi	Shah	lead1_iotaqi@example.com	+91-9792437034	PhonePe	Bangalore	Ad Campaign	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	ACTIVE	COLD	23	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #2 for CleanAir IoT	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
eac454a0-056f-4d0a-90e9-788c3cddd1ad	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Kavya	Chopra	lead2_iotaqi@example.com	+91-9750645088	Swiggy	Bangalore	Ad Campaign	e2e6d382-7c84-43ba-be48-fb206fd4c3b8	MEETING_SCHEDULED	HOT	129	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #3 for CleanAir IoT	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
da2a51a9-3fe4-4d9b-8f93-c2fcc822707f	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Vikram	Agarwal	lead3_iotaqi@example.com	+91-9030573353	Wipro	Bangalore	Cold Call	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	PROPOSAL_SENT	HOT	101	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #4 for CleanAir IoT	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d9a1ad77-de1f-46cf-b332-c34cd0aa5d1d	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Nisha	Joshi	lead4_iotaqi@example.com	+91-9177853915	MindTree	Mumbai	CSV Import	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ENGAGED	WARM	73	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #5 for CleanAir IoT	{}	2026-05-10 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
2cf52922-871c-4432-979a-e8eaf1f91874	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Ravi	Gupta	lead5_iotaqi@example.com	+91-9312049029	BYJU's	Delhi	Ad Campaign	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	ENGAGED	WARM	49	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #6 for CleanAir IoT	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d444ba75-e224-4283-b6c7-d354af6ba75d	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Divya	Singh	lead6_iotaqi@example.com	+91-9807289379	Zomato	Hyderabad	Cold Call	f6d352e4-a370-46a4-a080-c989b5460f68	PROPOSAL_SENT	HOT	145	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #7 for CleanAir IoT	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
fe9d5fd9-fa84-4698-8e85-c313006be135	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Anjali	Verma	lead7_iotaqi@example.com	+91-9029316864	Swiggy	Kolkata	Website	f6d352e4-a370-46a4-a080-c989b5460f68	ACTIVE	COLD	18	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #8 for CleanAir IoT	{}	2026-05-14 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f3a6b4f1-b312-463c-9e69-e54bdcc3291c	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Meera	Singh	lead8_iotaqi@example.com	+91-9617392644	Wipro	Kolkata	Website	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	ENGAGED	WARM	78	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #9 for CleanAir IoT	{}	2026-05-04 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
821cbd74-f77c-4d66-922e-e17ec6418b93	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Rohan	Gupta	lead9_iotaqi@example.com	+91-9839754817	Zomato	Bangalore	Ad Campaign	e2e6d382-7c84-43ba-be48-fb206fd4c3b8	MEETING_SCHEDULED	HOT	119	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #10 for CleanAir IoT	{}	2026-05-02 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
37081810-7423-4f5a-94ad-fab46e58c554	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Vikram	Mehta	lead10_iotaqi@example.com	+91-9738841879	CRED	Pune	Event/Expo	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	ENGAGED	HOT	99	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #11 for CleanAir IoT	{}	2026-05-08 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
207f62f5-5de8-44f2-ad0d-4b7c9654d397	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Siddharth	Gupta	lead11_iotaqi@example.com	+91-9331691261	HCL	Bangalore	Ad Campaign	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ENGAGED	WARM	63	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #12 for CleanAir IoT	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
ecafa6d7-97b7-44c5-b7dd-c1553650fed9	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Nikhil	Kulkarni	lead12_iotaqi@example.com	+91-9801088683	CRED	Delhi	Field Visit	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	CONVERTED	CONVERTED	32	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #13 for CleanAir IoT	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
dc22349b-ff99-47fc-9baa-0417abaf3a93	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Vikram	Shah	lead13_iotaqi@example.com	+91-9496115175	PhonePe	Kolkata	Ad Campaign	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	MEETING_SCHEDULED	HOT	111	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #14 for CleanAir IoT	{}	2026-05-08 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f56aec55-867b-45b1-b4af-88b98707f98d	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Vikram	Verma	lead14_iotaqi@example.com	+91-9318725145	Flipkart	Hyderabad	CSV Import	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	MEETING_SCHEDULED	HOT	105	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #15 for CleanAir IoT	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
32eab966-80d5-4df8-b8c8-c90691642f1a	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Nisha	Bhat	lead15_iotaqi@example.com	+91-9856895138	Infosys	Bangalore	Ad Campaign	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	LOST	LOST	136	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #16 for CleanAir IoT	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
73b78420-727d-4f20-858d-d622d99af546	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Manish	Gupta	lead16_iotaqi@example.com	+91-9033135409	PhonePe	Mumbai	Ad Campaign	f6d352e4-a370-46a4-a080-c989b5460f68	ENGAGED	WARM	60	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #17 for CleanAir IoT	{}	2026-05-09 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4f4b4950-5343-423d-87a6-ca74d037a1e2	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Kavya	Iyer	lead17_iotaqi@example.com	+91-9492837227	Freshworks	Hyderabad	Ad Campaign	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	NEGOTIATION	HOT	94	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #18 for CleanAir IoT	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
2eba8322-a6a2-4ac9-81ac-9705a852d010	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Anjali	Rao	lead18_iotaqi@example.com	+91-9344631824	TCS	Mumbai	Ad Campaign	e2e6d382-7c84-43ba-be48-fb206fd4c3b8	ENGAGED	WARM	41	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #19 for CleanAir IoT	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
42a1aad1-18e6-4437-ad57-5d3dbb0434a6	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Manish	Verma	lead19_iotaqi@example.com	+91-9861537485	MindTree	Mumbai	Website	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ACTIVE	COLD	10	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #20 for CleanAir IoT	{}	2026-05-08 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
8161adc1-298a-4d19-8a64-569f49b4090f	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Isha	Chopra	lead20_iotaqi@example.com	+91-9889189906	Wipro	Delhi	Website	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	STALE	STALE	47	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #21 for CleanAir IoT	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
22d9f63f-a011-4036-acdd-6bee551b11ae	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Anjali	Kulkarni	lead21_iotaqi@example.com	+91-9651947225	Freshworks	Mumbai	Ad Campaign	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	PROPOSAL_SENT	HOT	90	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #22 for CleanAir IoT	{}	2026-05-12 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
6f22dd9c-b9ca-4f03-bfcc-9ca0b3221835	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Meera	Menon	lead22_iotaqi@example.com	+91-9889045391	Swiggy	Bangalore	Ad Campaign	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	ENGAGED	WARM	45	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #23 for CleanAir IoT	{}	2026-05-04 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
b15006dc-adaf-4509-87e6-999b32ddd619	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Rohan	Mishra	lead23_iotaqi@example.com	+91-9102066475	Razorpay	Hyderabad	Ad Campaign	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	NEW	COLD	14	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #24 for CleanAir IoT	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cc8e7dc8-8c53-4193-84ef-11fc9c8a122a	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Nisha	Agarwal	lead24_iotaqi@example.com	+91-9475671451	Swiggy	Hyderabad	CSV Import	f6d352e4-a370-46a4-a080-c989b5460f68	CONVERTED	CONVERTED	137	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #25 for CleanAir IoT	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
7ab260f9-3566-4f8f-a19b-c3c417aa2804	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Rohan	Pandey	lead25_iotaqi@example.com	+91-9764274624	Infosys	Delhi	Field Visit	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	ENGAGED	WARM	47	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #26 for CleanAir IoT	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
fa3a7c7a-3be1-4bb8-bada-215a3809d897	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Anjali	Gupta	lead26_iotaqi@example.com	+91-9349854454	Unacademy	Bangalore	Referral	f6d352e4-a370-46a4-a080-c989b5460f68	PROPOSAL_SENT	HOT	148	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #27 for CleanAir IoT	{}	2026-05-19 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
19df093b-ec55-4a05-87ba-c83a0d84d739	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Karan	Shah	lead27_iotaqi@example.com	+91-9745218182	CRED	Ahmedabad	Cold Call	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	ACTIVE	WARM	68	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #28 for CleanAir IoT	{}	2026-05-13 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
8c62225b-686f-4d63-bcf1-7c3b4f349080	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Ananya	Nair	lead28_iotaqi@example.com	+91-9553339475	Unacademy	Delhi	Website	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	MEETING_SCHEDULED	HOT	95	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #29 for CleanAir IoT	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
00e9001d-c2ee-48b1-a9d4-3ec5c20e414a	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Pooja	Malhotra	lead29_iotaqi@example.com	+91-9044838111	MindTree	Mumbai	Event/Expo	f6d352e4-a370-46a4-a080-c989b5460f68	MEETING_SCHEDULED	HOT	85	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #30 for CleanAir IoT	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
337a635e-e65f-47a3-a67e-c685e867c337	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Pooja	Pandey	lead30_iotaqi@example.com	+91-9885688428	Zomato	Pune	Referral	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	LOST	LOST	73	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #31 for CleanAir IoT	{}	2026-05-24 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9dd4a06a-f55e-4545-911a-960f948e61ea	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Manish	Shetty	lead31_iotaqi@example.com	+91-9766388857	HCL	Kolkata	CSV Import	f6d352e4-a370-46a4-a080-c989b5460f68	PROPOSAL_SENT	HOT	106	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #32 for CleanAir IoT	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
896fc855-69fa-4582-91df-dd98ebf1199d	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Aditya	Chopra	lead32_iotaqi@example.com	+91-9240886888	TCS	Delhi	Event/Expo	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ENGAGED	WARM	62	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #33 for CleanAir IoT	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e1b5a360-f24c-4e58-915a-39bf762b87db	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Siddharth	Pandey	lead33_iotaqi@example.com	+91-9145443123	Freshworks	Pune	CSV Import	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	ENGAGED	WARM	76	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #34 for CleanAir IoT	{}	2026-04-30 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
cf7f6f43-b19d-40a8-a5e7-41dd4c3b23ef	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Aditya	Shetty	lead34_iotaqi@example.com	+91-9711621914	Wipro	Bangalore	Ad Campaign	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ENGAGED	WARM	73	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #35 for CleanAir IoT	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f2e08904-670f-4e9c-b14c-b58810426353	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Vikram	Mehta	lead35_iotaqi@example.com	+91-9192265678	MindTree	Ahmedabad	Website	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ENGAGED	HOT	96	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #36 for CleanAir IoT	{}	2026-05-06 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a67c59c6-33a9-4410-82dc-c5f3d31122ae	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Isha	Bhat	lead36_iotaqi@example.com	+91-9436793508	PhonePe	Chennai	Website	f6d352e4-a370-46a4-a080-c989b5460f68	CONVERTED	CONVERTED	147	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #37 for CleanAir IoT	{}	2026-05-23 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
3d7dc6b3-3a69-4e9d-92e7-b2aba5e7d122	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Arjun	Shah	lead37_iotaqi@example.com	+91-9613987003	Flipkart	Ahmedabad	CSV Import	f6d352e4-a370-46a4-a080-c989b5460f68	NEGOTIATION	HOT	95	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #38 for CleanAir IoT	{}	2026-04-29 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
4d874a58-5abc-48e7-83cc-60ddb4237c64	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Nikhil	Mishra	lead38_iotaqi@example.com	+91-9311578543	MindTree	Pune	Ad Campaign	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ACTIVE	WARM	48	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #39 for CleanAir IoT	{}	2026-05-11 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a3fdc6f3-afe5-469d-bbb3-f12d6c7d69f9	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Anjali	Menon	lead39_iotaqi@example.com	+91-9839170635	Freshworks	Mumbai	Ad Campaign	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ACTIVE	WARM	53	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #40 for CleanAir IoT	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
dced45fa-e41c-464c-8af8-ec36b190873c	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Deepak	Kulkarni	lead40_iotaqi@example.com	+91-9210550710	Wipro	Delhi	Field Visit	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	STALE	STALE	146	7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #41 for CleanAir IoT	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
d474312a-bd2e-46d4-bddd-8cd9ea691e37	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Pooja	Rao	lead41_iotaqi@example.com	+91-9154213612	CRED	Hyderabad	Referral	3d19f4fd-d3de-48c3-83ac-3b5abfb26e2b	ACTIVE	COLD	1	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #42 for CleanAir IoT	{}	2026-05-22 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
5d95220c-6750-44f0-acd4-94629ee95986	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Ravi	Verma	lead42_iotaqi@example.com	+91-9840447005	Swiggy	Delhi	Website	2e04ab4c-412b-4a68-87a7-2ad6b77770ca	ACTIVE	WARM	66	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #43 for CleanAir IoT	{}	2026-05-05 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
a61c6114-0603-4d02-a2ca-560a25bcaf19	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Kavya	Mehta	lead43_iotaqi@example.com	+91-9418351087	Infosys	Ahmedabad	Referral	f6d352e4-a370-46a4-a080-c989b5460f68	PROPOSAL_SENT	HOT	137	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #44 for CleanAir IoT	{}	2026-05-27 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
f2fc55d1-6788-4f1e-b72d-8dc17f0cacd3	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Meera	Singh	lead44_iotaqi@example.com	+91-9164958038	Swiggy	Delhi	Website	f6d352e4-a370-46a4-a080-c989b5460f68	ENGAGED	HOT	113	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #45 for CleanAir IoT	{}	2026-05-03 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
c3f26ac3-a7fc-4ea2-83c6-d93047a8a552	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Manish	Menon	lead45_iotaqi@example.com	+91-9849077909	Freshworks	Mumbai	Referral	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	LOST	LOST	133	6b847887-5207-409a-b399-32349070edc9	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #46 for CleanAir IoT	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
9b84cbac-34ce-4da9-80db-456e64153418	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Ananya	Kulkarni	lead46_iotaqi@example.com	+91-9321716269	HCL	Chennai	Ad Campaign	e2e6d382-7c84-43ba-be48-fb206fd4c3b8	ENGAGED	HOT	122	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #47 for CleanAir IoT	{}	2026-05-20 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
13172400-8ab8-48f3-ac6e-5bcf45dac823	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Ravi	Singh	lead47_iotaqi@example.com	+91-9387007340	Freshworks	Kolkata	Ad Campaign	6eb312f7-4524-4e4f-b8f5-783d345e9ae9	ACTIVE	WARM	63	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #48 for CleanAir IoT	{}	2026-05-21 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
e3a423b2-9a27-4652-a1ba-30e490126c74	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Isha	Gupta	lead48_iotaqi@example.com	+91-9741075149	MindTree	Bangalore	Referral	e2e6d382-7c84-43ba-be48-fb206fd4c3b8	CONVERTED	CONVERTED	109	53dcddee-6bbe-4d96-b8a3-01b09e9be315	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #49 for CleanAir IoT	{}	2026-05-25 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
59de960f-4e60-4b25-9c46-98e23c4b8beb	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Pooja	Singh	lead49_iotaqi@example.com	+91-9346813119	CRED	Bangalore	Event/Expo	f6d352e4-a370-46a4-a080-c989b5460f68	ENGAGED	HOT	134	167b2073-5282-4e24-a2ec-aec095b710c5	61b2339a-fd08-4931-84ac-0ae425e5b173	t	f	valid	Lead #50 for CleanAir IoT	{}	2026-05-04 04:34:16.655+00	\N	2026-05-27 04:34:16.655+00	2026-05-27 04:34:16.655+00
\.


--
-- Data for Name: nurturing_settings; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.nurturing_settings (id, tenant_id, cold_outreach_interval_days, warm_sequence_interval_days, stale_reengagement_interval_days, max_cold_attempts, daily_send_window_start, daily_send_window_end, allowed_send_days, blackout_dates, global_pause, global_pause_until, max_messages_per_week, created_at, updated_at) FROM stdin;
c9737631-337a-4cc3-9bf2-cba39be47888	00771436-6364-463c-bdcc-1b9d2a23536c	5	2	14	6	09:00	18:00	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}	{}	f	\N	3	2026-05-27 04:34:16.759+00	2026-05-27 04:34:16.759+00
06f3f50c-7b6f-4a47-9789-77fa16d531e8	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	5	2	14	6	09:00	18:00	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}	{}	f	\N	3	2026-05-27 04:34:16.76+00	2026-05-27 04:34:16.76+00
b22712f9-c748-4b90-9116-ee5be511f85e	41f6cf1a-6695-4163-a5c3-560d519bac96	5	2	14	6	09:00	18:00	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}	{}	f	\N	3	2026-05-27 04:34:16.761+00	2026-05-27 04:34:16.761+00
d3880f12-bb91-45d6-a618-f0877fa5a2eb	6dc57766-f52a-4f01-a0da-75511fb3f2a1	5	2	14	6	09:00	18:00	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}	{}	f	\N	3	2026-05-27 04:34:16.762+00	2026-05-27 04:34:16.762+00
3924cc9f-696c-4b65-8151-2f5413cdf3af	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	5	2	14	6	09:00	18:00	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}	{}	f	\N	3	2026-05-27 04:34:16.763+00	2026-05-27 04:34:16.763+00
31a0c274-5080-45aa-81b7-040b707b2d34	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	5	2	14	6	09:00	18:00	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}	{}	f	\N	3	2026-05-27 04:34:16.764+00	2026-05-27 04:34:16.764+00
\.


--
-- Data for Name: outreach_records; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.outreach_records (id, tenant_id, lead_id, template_id, channel, sent_at, status, failure_reason, sequence_step, subject_line, body_preview, rep_id, tracking_id, opened_at, clicked_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: routing_rules; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.routing_rules (id, tenant_id, name, condition_expression, action_config, priority, is_active, created_at, updated_at) FROM stdin;
3676523b-3f88-45e6-91c7-4b467a224df1	00771436-6364-463c-bdcc-1b9d2a23536c	Hot Lead Escalation	{"operator": "OR", "conditions": [{"op": ">=", "field": "score", "value": 80}, {"op": ">=", "field": "cta_clicks_48h", "value": 3}]}	{"action": "assign_senior_rep", "sequence": "hot_escalation", "notify_manager": true}	1	t	2026-05-27 04:34:16.747+00	2026-05-27 04:34:16.747+00
cd663164-88e5-4658-8440-6e5337506a59	00771436-6364-463c-bdcc-1b9d2a23536c	Warm Lead SDR Assignment	{"operator": "AND", "conditions": [{"op": ">=", "field": "score", "value": 40}, {"op": "<", "field": "score", "value": 80}]}	{"pool": "sdr", "action": "assign_round_robin", "sequence": "warm_engagement"}	2	t	2026-05-27 04:34:16.747+00	2026-05-27 04:34:16.747+00
9b35e499-e312-414e-b99d-b90bb8f3ab9a	00771436-6364-463c-bdcc-1b9d2a23536c	Cold Lead Nurture	{"operator": "AND", "conditions": [{"op": "<", "field": "score", "value": 40}]}	{"action": "enroll_sequence", "sequence": "cold_nurture", "no_rep_assign": true}	3	t	2026-05-27 04:34:16.747+00	2026-05-27 04:34:16.747+00
d91c46a2-976f-4872-acc7-fc2fbe8e38e6	00771436-6364-463c-bdcc-1b9d2a23536c	Stale Re-engagement	{"operator": "AND", "conditions": [{"op": ">=", "field": "days_inactive", "value": 30}]}	{"action": "mark_stale", "sequence": "stale_reengagement"}	4	t	2026-05-27 04:34:16.747+00	2026-05-27 04:34:16.747+00
61b105a4-3420-4c17-a801-48c854cc9b9f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Hot Lead Escalation	{"operator": "OR", "conditions": [{"op": ">=", "field": "score", "value": 80}, {"op": ">=", "field": "cta_clicks_48h", "value": 3}]}	{"action": "assign_senior_rep", "sequence": "hot_escalation", "notify_manager": true}	1	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
c32f9284-2738-4565-9c9b-174395ac4835	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Warm Lead SDR Assignment	{"operator": "AND", "conditions": [{"op": ">=", "field": "score", "value": 40}, {"op": "<", "field": "score", "value": 80}]}	{"pool": "sdr", "action": "assign_round_robin", "sequence": "warm_engagement"}	2	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
aa89d184-3b90-4a59-a9e0-622adbcdbef9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Cold Lead Nurture	{"operator": "AND", "conditions": [{"op": "<", "field": "score", "value": 40}]}	{"action": "enroll_sequence", "sequence": "cold_nurture", "no_rep_assign": true}	3	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
31fc9f81-36ea-4016-bb6d-a0566f08a3fc	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Stale Re-engagement	{"operator": "AND", "conditions": [{"op": ">=", "field": "days_inactive", "value": 30}]}	{"action": "mark_stale", "sequence": "stale_reengagement"}	4	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
e434b0bc-f66f-4096-88e1-502a1bde17b7	41f6cf1a-6695-4163-a5c3-560d519bac96	Hot Lead Escalation	{"operator": "OR", "conditions": [{"op": ">=", "field": "score", "value": 80}, {"op": ">=", "field": "cta_clicks_48h", "value": 3}]}	{"action": "assign_senior_rep", "sequence": "hot_escalation", "notify_manager": true}	1	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
5c05b0fe-572f-4d34-9857-8c8a65a9d124	41f6cf1a-6695-4163-a5c3-560d519bac96	Warm Lead SDR Assignment	{"operator": "AND", "conditions": [{"op": ">=", "field": "score", "value": 40}, {"op": "<", "field": "score", "value": 80}]}	{"pool": "sdr", "action": "assign_round_robin", "sequence": "warm_engagement"}	2	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
da13c98b-567f-4cf7-a7b4-3c2dd0bc7978	41f6cf1a-6695-4163-a5c3-560d519bac96	Cold Lead Nurture	{"operator": "AND", "conditions": [{"op": "<", "field": "score", "value": 40}]}	{"action": "enroll_sequence", "sequence": "cold_nurture", "no_rep_assign": true}	3	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
9c45dc66-0295-4a1e-a508-12bf62b1c634	41f6cf1a-6695-4163-a5c3-560d519bac96	Stale Re-engagement	{"operator": "AND", "conditions": [{"op": ">=", "field": "days_inactive", "value": 30}]}	{"action": "mark_stale", "sequence": "stale_reengagement"}	4	t	2026-05-27 04:34:16.749+00	2026-05-27 04:34:16.749+00
30a1df38-6f7e-45d8-954c-146c5f248b53	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Hot Lead Escalation	{"operator": "OR", "conditions": [{"op": ">=", "field": "score", "value": 80}, {"op": ">=", "field": "cta_clicks_48h", "value": 3}]}	{"action": "assign_senior_rep", "sequence": "hot_escalation", "notify_manager": true}	1	t	2026-05-27 04:34:16.75+00	2026-05-27 04:34:16.75+00
13d57cf6-69b8-4788-b9da-3f682961df35	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Warm Lead SDR Assignment	{"operator": "AND", "conditions": [{"op": ">=", "field": "score", "value": 40}, {"op": "<", "field": "score", "value": 80}]}	{"pool": "sdr", "action": "assign_round_robin", "sequence": "warm_engagement"}	2	t	2026-05-27 04:34:16.75+00	2026-05-27 04:34:16.75+00
efb815f9-da49-4c06-9579-5376e074b6c4	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Cold Lead Nurture	{"operator": "AND", "conditions": [{"op": "<", "field": "score", "value": 40}]}	{"action": "enroll_sequence", "sequence": "cold_nurture", "no_rep_assign": true}	3	t	2026-05-27 04:34:16.75+00	2026-05-27 04:34:16.75+00
99514839-9100-4a40-9ff0-058358ebbe2a	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Stale Re-engagement	{"operator": "AND", "conditions": [{"op": ">=", "field": "days_inactive", "value": 30}]}	{"action": "mark_stale", "sequence": "stale_reengagement"}	4	t	2026-05-27 04:34:16.75+00	2026-05-27 04:34:16.75+00
d3f5471b-3f03-4ab1-913a-041dab1b4897	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Hot Lead Escalation	{"operator": "OR", "conditions": [{"op": ">=", "field": "score", "value": 80}, {"op": ">=", "field": "cta_clicks_48h", "value": 3}]}	{"action": "assign_senior_rep", "sequence": "hot_escalation", "notify_manager": true}	1	t	2026-05-27 04:34:16.751+00	2026-05-27 04:34:16.751+00
9d2d318f-88f0-4c0c-97f0-fd9f7ed6411c	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Warm Lead SDR Assignment	{"operator": "AND", "conditions": [{"op": ">=", "field": "score", "value": 40}, {"op": "<", "field": "score", "value": 80}]}	{"pool": "sdr", "action": "assign_round_robin", "sequence": "warm_engagement"}	2	t	2026-05-27 04:34:16.751+00	2026-05-27 04:34:16.751+00
bf4cd5f9-7595-4a96-ab04-9344c0b2b5de	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Cold Lead Nurture	{"operator": "AND", "conditions": [{"op": "<", "field": "score", "value": 40}]}	{"action": "enroll_sequence", "sequence": "cold_nurture", "no_rep_assign": true}	3	t	2026-05-27 04:34:16.751+00	2026-05-27 04:34:16.751+00
c4285ade-45d2-48d4-a1ab-44dcd9ca590e	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Stale Re-engagement	{"operator": "AND", "conditions": [{"op": ">=", "field": "days_inactive", "value": 30}]}	{"action": "mark_stale", "sequence": "stale_reengagement"}	4	t	2026-05-27 04:34:16.751+00	2026-05-27 04:34:16.751+00
3005ec1f-4675-4b48-a9f2-92ba3a72932d	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Hot Lead Escalation	{"operator": "OR", "conditions": [{"op": ">=", "field": "score", "value": 80}, {"op": ">=", "field": "cta_clicks_48h", "value": 3}]}	{"action": "assign_senior_rep", "sequence": "hot_escalation", "notify_manager": true}	1	t	2026-05-27 04:34:16.752+00	2026-05-27 04:34:16.752+00
9394192f-c491-4dd0-ae57-5e7a8752cdb6	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Warm Lead SDR Assignment	{"operator": "AND", "conditions": [{"op": ">=", "field": "score", "value": 40}, {"op": "<", "field": "score", "value": 80}]}	{"pool": "sdr", "action": "assign_round_robin", "sequence": "warm_engagement"}	2	t	2026-05-27 04:34:16.752+00	2026-05-27 04:34:16.752+00
ec9eef80-1e8b-4b0d-ab17-620c4b68cb06	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Cold Lead Nurture	{"operator": "AND", "conditions": [{"op": "<", "field": "score", "value": 40}]}	{"action": "enroll_sequence", "sequence": "cold_nurture", "no_rep_assign": true}	3	t	2026-05-27 04:34:16.752+00	2026-05-27 04:34:16.752+00
4a2b5360-df88-4d6a-9e78-9a135505e6e0	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Stale Re-engagement	{"operator": "AND", "conditions": [{"op": ">=", "field": "days_inactive", "value": 30}]}	{"action": "mark_stale", "sequence": "stale_reengagement"}	4	t	2026-05-27 04:34:16.752+00	2026-05-27 04:34:16.752+00
\.


--
-- Data for Name: scoring_profiles; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.scoring_profiles (id, tenant_id, name, event_weights, type_thresholds, version, is_active, created_at, updated_at) FROM stdin;
ba6d8cdf-0b24-4aa9-b448-9060f045f0ee	00771436-6364-463c-bdcc-1b9d2a23536c	Default Scoring Profile	{"call_booked": 40, "email_opened": 5, "website_visit": 10, "asset_downloaded": 20, "form_resubmitted": 25, "whatsapp_replied": 20, "email_cta_clicked": 15, "no_activity_7_days": -10, "no_activity_30_days": -30, "whatsapp_link_clicked": 15, "website_visit_high_intent": 20}	{"hot": {"max": 200, "min": 80}, "cold": {"max": 39, "min": 0}, "warm": {"max": 79, "min": 40}}	1	t	2026-05-27 04:34:16.753+00	2026-05-27 04:34:16.753+00
d22be5b2-c13c-447e-860b-863f17936f0c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Default Scoring Profile	{"call_booked": 40, "email_opened": 5, "website_visit": 10, "asset_downloaded": 20, "form_resubmitted": 25, "whatsapp_replied": 20, "email_cta_clicked": 15, "no_activity_7_days": -10, "no_activity_30_days": -30, "whatsapp_link_clicked": 15, "website_visit_high_intent": 20}	{"hot": {"max": 200, "min": 80}, "cold": {"max": 39, "min": 0}, "warm": {"max": 79, "min": 40}}	1	t	2026-05-27 04:34:16.754+00	2026-05-27 04:34:16.754+00
b459653d-74c4-41d1-83b7-043254022a23	41f6cf1a-6695-4163-a5c3-560d519bac96	Default Scoring Profile	{"call_booked": 40, "email_opened": 5, "website_visit": 10, "asset_downloaded": 20, "form_resubmitted": 25, "whatsapp_replied": 20, "email_cta_clicked": 15, "no_activity_7_days": -10, "no_activity_30_days": -30, "whatsapp_link_clicked": 15, "website_visit_high_intent": 20}	{"hot": {"max": 200, "min": 80}, "cold": {"max": 39, "min": 0}, "warm": {"max": 79, "min": 40}}	1	t	2026-05-27 04:34:16.755+00	2026-05-27 04:34:16.755+00
f352218f-5eb6-4cf4-8716-3cf9d52d876c	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Default Scoring Profile	{"call_booked": 40, "email_opened": 5, "website_visit": 10, "asset_downloaded": 20, "form_resubmitted": 25, "whatsapp_replied": 20, "email_cta_clicked": 15, "no_activity_7_days": -10, "no_activity_30_days": -30, "whatsapp_link_clicked": 15, "website_visit_high_intent": 20}	{"hot": {"max": 200, "min": 80}, "cold": {"max": 39, "min": 0}, "warm": {"max": 79, "min": 40}}	1	t	2026-05-27 04:34:16.756+00	2026-05-27 04:34:16.756+00
f6c7df9e-e987-4b07-bfc8-ba42f4d2efeb	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Default Scoring Profile	{"call_booked": 40, "email_opened": 5, "website_visit": 10, "asset_downloaded": 20, "form_resubmitted": 25, "whatsapp_replied": 20, "email_cta_clicked": 15, "no_activity_7_days": -10, "no_activity_30_days": -30, "whatsapp_link_clicked": 15, "website_visit_high_intent": 20}	{"hot": {"max": 200, "min": 80}, "cold": {"max": 39, "min": 0}, "warm": {"max": 79, "min": 40}}	1	t	2026-05-27 04:34:16.757+00	2026-05-27 04:34:16.757+00
ddc46a36-54db-4312-96f5-c7e55dd10785	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Default Scoring Profile	{"call_booked": 40, "email_opened": 5, "website_visit": 10, "asset_downloaded": 20, "form_resubmitted": 25, "whatsapp_replied": 20, "email_cta_clicked": 15, "no_activity_7_days": -10, "no_activity_30_days": -30, "whatsapp_link_clicked": 15, "website_visit_high_intent": 20}	{"hot": {"max": 200, "min": 80}, "cold": {"max": 39, "min": 0}, "warm": {"max": 79, "min": 40}}	1	t	2026-05-27 04:34:16.758+00	2026-05-27 04:34:16.758+00
\.


--
-- Data for Name: sequence_enrollments; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.sequence_enrollments (id, tenant_id, lead_id, sequence_id, current_step, started_at, next_step_at, status, completed_at, exit_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sequences; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.sequences (id, tenant_id, name, trigger_type, lead_type_target, steps, status, created_by, created_at, updated_at) FROM stdin;
5429065f-2b20-4bac-aa03-7dcc9d5dc874	00771436-6364-463c-bdcc-1b9d2a23536c	Cold Lead Nurture	enrollment	COLD	[{"day": 0, "notes": "Welcome email with brochure", "channel": "email", "template_category": "welcome"}, {"day": 2, "notes": "Follow-up check-in", "channel": "email", "template_category": "follow_up"}, {"day": 5, "notes": "Value proposition email", "channel": "email", "template_category": "onboarding"}, {"day": 10, "notes": "Special offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final nudge", "channel": "email", "template_category": "follow_up"}, {"day": 21, "notes": "Re-engagement attempt", "channel": "email", "template_category": "reengagement"}]	active	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.741+00	2026-05-27 04:34:16.741+00
fcd5fca1-6047-4439-a9a3-a670675d4b5b	00771436-6364-463c-bdcc-1b9d2a23536c	Warm Lead Engagement	score_change	WARM	[{"day": 0, "notes": "Accelerated engagement", "channel": "email", "template_category": "onboarding"}, {"day": 2, "notes": "Conversion offer", "channel": "email", "template_category": "discount"}, {"day": 5, "notes": "Schedule meeting", "channel": "email", "template_category": "follow_up"}]	active	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.741+00	2026-05-27 04:34:16.741+00
f41e5d8e-f48f-465f-bb28-518154013be6	00771436-6364-463c-bdcc-1b9d2a23536c	Post-Purchase Sequence	conversion	CONVERTED	[{"day": 0, "notes": "Thank you", "channel": "email", "template_category": "post_purchase"}, {"day": 3, "notes": "Getting started", "channel": "email", "template_category": "onboarding"}, {"day": 7, "notes": "Cross-sell accessories", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Check-in & feedback request", "channel": "email", "template_category": "follow_up"}, {"day": 30, "notes": "Referral program", "channel": "email", "template_category": "discount"}]	active	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.741+00	2026-05-27 04:34:16.741+00
67212e63-44b7-4ddc-bfed-d1b9d9130843	00771436-6364-463c-bdcc-1b9d2a23536c	Stale Lead Re-engagement	stale	STALE	[{"day": 0, "notes": "We miss you", "channel": "email", "template_category": "reengagement"}, {"day": 7, "notes": "Special comeback offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final reach-out", "channel": "email", "template_category": "follow_up"}]	active	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.741+00	2026-05-27 04:34:16.741+00
a8b582bc-d847-488e-8954-e2aa1bac6aa1	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Cold Lead Nurture	enrollment	COLD	[{"day": 0, "notes": "Welcome email with brochure", "channel": "email", "template_category": "welcome"}, {"day": 2, "notes": "Follow-up check-in", "channel": "email", "template_category": "follow_up"}, {"day": 5, "notes": "Value proposition email", "channel": "email", "template_category": "onboarding"}, {"day": 10, "notes": "Special offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final nudge", "channel": "email", "template_category": "follow_up"}, {"day": 21, "notes": "Re-engagement attempt", "channel": "email", "template_category": "reengagement"}]	active	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.743+00	2026-05-27 04:34:16.743+00
6a6eef72-3da2-4b8e-ace7-377f90ef2e9d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Warm Lead Engagement	score_change	WARM	[{"day": 0, "notes": "Accelerated engagement", "channel": "email", "template_category": "onboarding"}, {"day": 2, "notes": "Conversion offer", "channel": "email", "template_category": "discount"}, {"day": 5, "notes": "Schedule meeting", "channel": "email", "template_category": "follow_up"}]	active	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.743+00	2026-05-27 04:34:16.743+00
07b2d3c7-204d-46fa-adab-160eefe20d2e	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Post-Purchase Sequence	conversion	CONVERTED	[{"day": 0, "notes": "Thank you", "channel": "email", "template_category": "post_purchase"}, {"day": 3, "notes": "Getting started", "channel": "email", "template_category": "onboarding"}, {"day": 7, "notes": "Cross-sell accessories", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Check-in & feedback request", "channel": "email", "template_category": "follow_up"}, {"day": 30, "notes": "Referral program", "channel": "email", "template_category": "discount"}]	active	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.743+00	2026-05-27 04:34:16.743+00
61fee4ef-35dd-43f9-81db-8ec5cba752be	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Stale Lead Re-engagement	stale	STALE	[{"day": 0, "notes": "We miss you", "channel": "email", "template_category": "reengagement"}, {"day": 7, "notes": "Special comeback offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final reach-out", "channel": "email", "template_category": "follow_up"}]	active	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.743+00	2026-05-27 04:34:16.743+00
4411ee42-c6e8-4875-8042-5220a250bf80	41f6cf1a-6695-4163-a5c3-560d519bac96	Cold Lead Nurture	enrollment	COLD	[{"day": 0, "notes": "Welcome email with brochure", "channel": "email", "template_category": "welcome"}, {"day": 2, "notes": "Follow-up check-in", "channel": "email", "template_category": "follow_up"}, {"day": 5, "notes": "Value proposition email", "channel": "email", "template_category": "onboarding"}, {"day": 10, "notes": "Special offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final nudge", "channel": "email", "template_category": "follow_up"}, {"day": 21, "notes": "Re-engagement attempt", "channel": "email", "template_category": "reengagement"}]	active	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.744+00	2026-05-27 04:34:16.744+00
d16de0d4-685d-4e64-b2cd-72ad6f65beec	41f6cf1a-6695-4163-a5c3-560d519bac96	Warm Lead Engagement	score_change	WARM	[{"day": 0, "notes": "Accelerated engagement", "channel": "email", "template_category": "onboarding"}, {"day": 2, "notes": "Conversion offer", "channel": "email", "template_category": "discount"}, {"day": 5, "notes": "Schedule meeting", "channel": "email", "template_category": "follow_up"}]	active	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.744+00	2026-05-27 04:34:16.744+00
3694fa3c-c358-4302-ae78-22c36d0adaa1	41f6cf1a-6695-4163-a5c3-560d519bac96	Post-Purchase Sequence	conversion	CONVERTED	[{"day": 0, "notes": "Thank you", "channel": "email", "template_category": "post_purchase"}, {"day": 3, "notes": "Getting started", "channel": "email", "template_category": "onboarding"}, {"day": 7, "notes": "Cross-sell accessories", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Check-in & feedback request", "channel": "email", "template_category": "follow_up"}, {"day": 30, "notes": "Referral program", "channel": "email", "template_category": "discount"}]	active	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.744+00	2026-05-27 04:34:16.744+00
cf77f002-e32b-4e47-a99a-65c3532ef049	41f6cf1a-6695-4163-a5c3-560d519bac96	Stale Lead Re-engagement	stale	STALE	[{"day": 0, "notes": "We miss you", "channel": "email", "template_category": "reengagement"}, {"day": 7, "notes": "Special comeback offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final reach-out", "channel": "email", "template_category": "follow_up"}]	active	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.744+00	2026-05-27 04:34:16.744+00
3a8647f0-4136-435d-98ea-000777083bad	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Cold Lead Nurture	enrollment	COLD	[{"day": 0, "notes": "Welcome email with brochure", "channel": "email", "template_category": "welcome"}, {"day": 2, "notes": "Follow-up check-in", "channel": "email", "template_category": "follow_up"}, {"day": 5, "notes": "Value proposition email", "channel": "email", "template_category": "onboarding"}, {"day": 10, "notes": "Special offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final nudge", "channel": "email", "template_category": "follow_up"}, {"day": 21, "notes": "Re-engagement attempt", "channel": "email", "template_category": "reengagement"}]	active	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.745+00	2026-05-27 04:34:16.745+00
5e9e7316-464b-459e-9ff1-499732cedf9a	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Warm Lead Engagement	score_change	WARM	[{"day": 0, "notes": "Accelerated engagement", "channel": "email", "template_category": "onboarding"}, {"day": 2, "notes": "Conversion offer", "channel": "email", "template_category": "discount"}, {"day": 5, "notes": "Schedule meeting", "channel": "email", "template_category": "follow_up"}]	active	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.745+00	2026-05-27 04:34:16.745+00
fcc7f97c-4275-4b4c-a859-83c83deee666	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Post-Purchase Sequence	conversion	CONVERTED	[{"day": 0, "notes": "Thank you", "channel": "email", "template_category": "post_purchase"}, {"day": 3, "notes": "Getting started", "channel": "email", "template_category": "onboarding"}, {"day": 7, "notes": "Cross-sell accessories", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Check-in & feedback request", "channel": "email", "template_category": "follow_up"}, {"day": 30, "notes": "Referral program", "channel": "email", "template_category": "discount"}]	active	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.745+00	2026-05-27 04:34:16.745+00
68ed0a3c-4ec2-4d2e-ad46-07ad291c2fa8	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Stale Lead Re-engagement	stale	STALE	[{"day": 0, "notes": "We miss you", "channel": "email", "template_category": "reengagement"}, {"day": 7, "notes": "Special comeback offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final reach-out", "channel": "email", "template_category": "follow_up"}]	active	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.745+00	2026-05-27 04:34:16.745+00
94e738f9-2fac-446a-a301-9e7afa1a853e	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Cold Lead Nurture	enrollment	COLD	[{"day": 0, "notes": "Welcome email with brochure", "channel": "email", "template_category": "welcome"}, {"day": 2, "notes": "Follow-up check-in", "channel": "email", "template_category": "follow_up"}, {"day": 5, "notes": "Value proposition email", "channel": "email", "template_category": "onboarding"}, {"day": 10, "notes": "Special offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final nudge", "channel": "email", "template_category": "follow_up"}, {"day": 21, "notes": "Re-engagement attempt", "channel": "email", "template_category": "reengagement"}]	active	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
8ff850f9-d034-4d8a-a867-faf7ad447e69	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Warm Lead Engagement	score_change	WARM	[{"day": 0, "notes": "Accelerated engagement", "channel": "email", "template_category": "onboarding"}, {"day": 2, "notes": "Conversion offer", "channel": "email", "template_category": "discount"}, {"day": 5, "notes": "Schedule meeting", "channel": "email", "template_category": "follow_up"}]	active	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
9760e0d4-895b-4bed-8ff9-684ee2aec761	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Post-Purchase Sequence	conversion	CONVERTED	[{"day": 0, "notes": "Thank you", "channel": "email", "template_category": "post_purchase"}, {"day": 3, "notes": "Getting started", "channel": "email", "template_category": "onboarding"}, {"day": 7, "notes": "Cross-sell accessories", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Check-in & feedback request", "channel": "email", "template_category": "follow_up"}, {"day": 30, "notes": "Referral program", "channel": "email", "template_category": "discount"}]	active	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
b86e01ff-0937-49fc-8f73-5b09953f2b55	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Stale Lead Re-engagement	stale	STALE	[{"day": 0, "notes": "We miss you", "channel": "email", "template_category": "reengagement"}, {"day": 7, "notes": "Special comeback offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final reach-out", "channel": "email", "template_category": "follow_up"}]	active	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
eb219ba1-9cbf-4af7-a886-10e2c869758d	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Cold Lead Nurture	enrollment	COLD	[{"day": 0, "notes": "Welcome email with brochure", "channel": "email", "template_category": "welcome"}, {"day": 2, "notes": "Follow-up check-in", "channel": "email", "template_category": "follow_up"}, {"day": 5, "notes": "Value proposition email", "channel": "email", "template_category": "onboarding"}, {"day": 10, "notes": "Special offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final nudge", "channel": "email", "template_category": "follow_up"}, {"day": 21, "notes": "Re-engagement attempt", "channel": "email", "template_category": "reengagement"}]	active	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
500e4cc4-0633-4cfe-bbc6-a13c6bdaf41d	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Warm Lead Engagement	score_change	WARM	[{"day": 0, "notes": "Accelerated engagement", "channel": "email", "template_category": "onboarding"}, {"day": 2, "notes": "Conversion offer", "channel": "email", "template_category": "discount"}, {"day": 5, "notes": "Schedule meeting", "channel": "email", "template_category": "follow_up"}]	active	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
125fa849-42db-424c-ad6d-0a67d2e5d5a8	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Post-Purchase Sequence	conversion	CONVERTED	[{"day": 0, "notes": "Thank you", "channel": "email", "template_category": "post_purchase"}, {"day": 3, "notes": "Getting started", "channel": "email", "template_category": "onboarding"}, {"day": 7, "notes": "Cross-sell accessories", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Check-in & feedback request", "channel": "email", "template_category": "follow_up"}, {"day": 30, "notes": "Referral program", "channel": "email", "template_category": "discount"}]	active	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
e4e3613a-af2f-4a3d-a710-835dcca994c1	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Stale Lead Re-engagement	stale	STALE	[{"day": 0, "notes": "We miss you", "channel": "email", "template_category": "reengagement"}, {"day": 7, "notes": "Special comeback offer", "channel": "email", "template_category": "discount"}, {"day": 14, "notes": "Final reach-out", "channel": "email", "template_category": "follow_up"}]	active	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.746+00	2026-05-27 04:34:16.746+00
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.templates (id, tenant_id, name, channel, subject, body, variables, category, is_active, created_by, created_at, updated_at) FROM stdin;
203d61eb-d1fe-4f31-8507-ab50631503e6	00771436-6364-463c-bdcc-1b9d2a23536c	Welcome Email	email	Welcome to {{company.name}}!	<h2>Hello {{lead.first_name}}!</h2><p>Thank you for your interest in {{company.name}}. We are thrilled to have you here.</p><p>Your dedicated representative, {{rep.name}}, will be reaching out shortly to understand your needs better.</p><p>In the meantime, feel free to explore our offerings at the link below:</p><p><a href="{{tracking.cta_url}}">Explore Now →</a></p><p>Best regards,<br/>{{rep.name}}<br/>{{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	welcome	t	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.705+00	2026-05-27 04:34:16.705+00
cd080cf8-ddb3-47bf-a3fd-a42ab7aa39bc	00771436-6364-463c-bdcc-1b9d2a23536c	Onboarding Guide	email	Getting Started with {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Welcome aboard! Here's a quick guide to help you get started:</p><ol><li>Review our product catalog</li><li>Schedule a demo call with {{rep.name}}</li><li>Set up your account preferences</li></ol><p><a href="{{tracking.cta_url}}">View Onboarding Guide →</a></p><p>Need help? Reach out to {{rep.name}} at {{rep.email}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	onboarding	t	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.707+00	2026-05-27 04:34:16.707+00
9bc7e0d2-1876-4aa9-8583-d69b305fb110	00771436-6364-463c-bdcc-1b9d2a23536c	Exclusive Discount Offer	email	🎉 Special Offer Just for You, {{lead.first_name}}!	<h2>Hi {{lead.first_name}},</h2><p>We have an exclusive offer waiting for you!</p><p>As a valued prospect of {{company.name}}, we'd like to offer you a <strong>15% discount</strong> on your first purchase.</p><p>This offer expires in 7 days.</p><p><a href="{{tracking.cta_url}}">Claim Your Discount →</a></p><p>Don't miss out!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	discount	t	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.708+00	2026-05-27 04:34:16.708+00
8b06aa2e-27e2-4576-9d5f-357092140ad6	00771436-6364-463c-bdcc-1b9d2a23536c	Post-Purchase Thank You	email	Thank You for Choosing {{company.name}}!	<h2>Congratulations, {{lead.first_name}}! 🎉</h2><p>Your purchase is confirmed. We're so grateful you chose {{company.name}}.</p><p>Here's what happens next:</p><ul><li>You'll receive your order confirmation within 24 hours</li><li>Our team will reach out for onboarding support</li><li>Access your dashboard for updates</li></ul><p>Have questions? Contact {{rep.name}} at {{rep.email}}</p><p>Welcome to the family!<br/>Team {{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	post_purchase	t	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.71+00	2026-05-27 04:34:16.71+00
79c7b924-d6a5-4b92-b6ea-bfefdd8cf392	00771436-6364-463c-bdcc-1b9d2a23536c	Follow-Up Nudge	email	Quick Check-in — {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Just checking in! Did you get a chance to review our brochure?</p><p>I'd love to schedule a quick 15-minute call to discuss how {{company.name}} can help {{lead.company}}.</p><p><a href="{{tracking.cta_url}}">Book a Call →</a></p><p>Looking forward to hearing from you!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	follow_up	t	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.711+00	2026-05-27 04:34:16.711+00
f4087628-6b0a-4db7-92ee-b1370263e0cd	00771436-6364-463c-bdcc-1b9d2a23536c	Re-engagement Email	email	We Miss You, {{lead.first_name}}!	<h2>Hey {{lead.first_name}},</h2><p>It's been a while since we last connected. We've been making great improvements and have some exciting updates to share.</p><p>Would you like to reconnect? Here's what's new:</p><ul><li>New features and products</li><li>Special returning customer benefits</li><li>Updated pricing plans</li></ul><p><a href="{{tracking.cta_url}}">See What's New →</a></p><p>We'd love to have you back!</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	reengagement	t	d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	2026-05-27 04:34:16.712+00	2026-05-27 04:34:16.712+00
8b001022-aa77-43e2-860c-c1b4b6528e0c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Welcome Email	email	Welcome to {{company.name}}!	<h2>Hello {{lead.first_name}}!</h2><p>Thank you for your interest in {{company.name}}. We are thrilled to have you here.</p><p>Your dedicated representative, {{rep.name}}, will be reaching out shortly to understand your needs better.</p><p>In the meantime, feel free to explore our offerings at the link below:</p><p><a href="{{tracking.cta_url}}">Explore Now →</a></p><p>Best regards,<br/>{{rep.name}}<br/>{{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	welcome	t	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.713+00	2026-05-27 04:34:16.713+00
9a0f75b0-261a-4e4e-817b-f4fc858c612d	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Onboarding Guide	email	Getting Started with {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Welcome aboard! Here's a quick guide to help you get started:</p><ol><li>Review our product catalog</li><li>Schedule a demo call with {{rep.name}}</li><li>Set up your account preferences</li></ol><p><a href="{{tracking.cta_url}}">View Onboarding Guide →</a></p><p>Need help? Reach out to {{rep.name}} at {{rep.email}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	onboarding	t	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.713+00	2026-05-27 04:34:16.713+00
bcb8dc2a-0c1b-467a-94ee-b208a278651c	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Exclusive Discount Offer	email	🎉 Special Offer Just for You, {{lead.first_name}}!	<h2>Hi {{lead.first_name}},</h2><p>We have an exclusive offer waiting for you!</p><p>As a valued prospect of {{company.name}}, we'd like to offer you a <strong>15% discount</strong> on your first purchase.</p><p>This offer expires in 7 days.</p><p><a href="{{tracking.cta_url}}">Claim Your Discount →</a></p><p>Don't miss out!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	discount	t	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.715+00	2026-05-27 04:34:16.715+00
4e2a9b7b-9e1b-4556-98d7-469ad2e61bf9	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Post-Purchase Thank You	email	Thank You for Choosing {{company.name}}!	<h2>Congratulations, {{lead.first_name}}! 🎉</h2><p>Your purchase is confirmed. We're so grateful you chose {{company.name}}.</p><p>Here's what happens next:</p><ul><li>You'll receive your order confirmation within 24 hours</li><li>Our team will reach out for onboarding support</li><li>Access your dashboard for updates</li></ul><p>Have questions? Contact {{rep.name}} at {{rep.email}}</p><p>Welcome to the family!<br/>Team {{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	post_purchase	t	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.716+00	2026-05-27 04:34:16.716+00
8bbfe875-1cd1-467e-a07b-047a54284697	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Follow-Up Nudge	email	Quick Check-in — {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Just checking in! Did you get a chance to review our brochure?</p><p>I'd love to schedule a quick 15-minute call to discuss how {{company.name}} can help {{lead.company}}.</p><p><a href="{{tracking.cta_url}}">Book a Call →</a></p><p>Looking forward to hearing from you!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	follow_up	t	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.716+00	2026-05-27 04:34:16.716+00
8e48ac41-5698-4585-8fa4-e53034233e28	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Re-engagement Email	email	We Miss You, {{lead.first_name}}!	<h2>Hey {{lead.first_name}},</h2><p>It's been a while since we last connected. We've been making great improvements and have some exciting updates to share.</p><p>Would you like to reconnect? Here's what's new:</p><ul><li>New features and products</li><li>Special returning customer benefits</li><li>Updated pricing plans</li></ul><p><a href="{{tracking.cta_url}}">See What's New →</a></p><p>We'd love to have you back!</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	reengagement	t	32970239-a684-4e3d-8a79-ed018d3ea83a	2026-05-27 04:34:16.717+00	2026-05-27 04:34:16.717+00
66858214-d041-4655-a993-41722b169910	41f6cf1a-6695-4163-a5c3-560d519bac96	Welcome Email	email	Welcome to {{company.name}}!	<h2>Hello {{lead.first_name}}!</h2><p>Thank you for your interest in {{company.name}}. We are thrilled to have you here.</p><p>Your dedicated representative, {{rep.name}}, will be reaching out shortly to understand your needs better.</p><p>In the meantime, feel free to explore our offerings at the link below:</p><p><a href="{{tracking.cta_url}}">Explore Now →</a></p><p>Best regards,<br/>{{rep.name}}<br/>{{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	welcome	t	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.718+00	2026-05-27 04:34:16.718+00
ac3e5e09-b827-4671-a007-2529a432040f	41f6cf1a-6695-4163-a5c3-560d519bac96	Onboarding Guide	email	Getting Started with {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Welcome aboard! Here's a quick guide to help you get started:</p><ol><li>Review our product catalog</li><li>Schedule a demo call with {{rep.name}}</li><li>Set up your account preferences</li></ol><p><a href="{{tracking.cta_url}}">View Onboarding Guide →</a></p><p>Need help? Reach out to {{rep.name}} at {{rep.email}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	onboarding	t	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.719+00	2026-05-27 04:34:16.719+00
380b0556-974e-48a6-beeb-99d4e15b4eaf	41f6cf1a-6695-4163-a5c3-560d519bac96	Exclusive Discount Offer	email	🎉 Special Offer Just for You, {{lead.first_name}}!	<h2>Hi {{lead.first_name}},</h2><p>We have an exclusive offer waiting for you!</p><p>As a valued prospect of {{company.name}}, we'd like to offer you a <strong>15% discount</strong> on your first purchase.</p><p>This offer expires in 7 days.</p><p><a href="{{tracking.cta_url}}">Claim Your Discount →</a></p><p>Don't miss out!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	discount	t	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.72+00	2026-05-27 04:34:16.72+00
118da918-7c80-4048-8202-b86374f8bf20	41f6cf1a-6695-4163-a5c3-560d519bac96	Post-Purchase Thank You	email	Thank You for Choosing {{company.name}}!	<h2>Congratulations, {{lead.first_name}}! 🎉</h2><p>Your purchase is confirmed. We're so grateful you chose {{company.name}}.</p><p>Here's what happens next:</p><ul><li>You'll receive your order confirmation within 24 hours</li><li>Our team will reach out for onboarding support</li><li>Access your dashboard for updates</li></ul><p>Have questions? Contact {{rep.name}} at {{rep.email}}</p><p>Welcome to the family!<br/>Team {{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	post_purchase	t	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.721+00	2026-05-27 04:34:16.721+00
a7b934a4-83c0-4c47-a444-2890dc5d8155	41f6cf1a-6695-4163-a5c3-560d519bac96	Follow-Up Nudge	email	Quick Check-in — {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Just checking in! Did you get a chance to review our brochure?</p><p>I'd love to schedule a quick 15-minute call to discuss how {{company.name}} can help {{lead.company}}.</p><p><a href="{{tracking.cta_url}}">Book a Call →</a></p><p>Looking forward to hearing from you!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	follow_up	t	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.722+00	2026-05-27 04:34:16.722+00
cb4557a9-22a9-436a-a394-f60637b9591c	41f6cf1a-6695-4163-a5c3-560d519bac96	Re-engagement Email	email	We Miss You, {{lead.first_name}}!	<h2>Hey {{lead.first_name}},</h2><p>It's been a while since we last connected. We've been making great improvements and have some exciting updates to share.</p><p>Would you like to reconnect? Here's what's new:</p><ul><li>New features and products</li><li>Special returning customer benefits</li><li>Updated pricing plans</li></ul><p><a href="{{tracking.cta_url}}">See What's New →</a></p><p>We'd love to have you back!</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	reengagement	t	71f133b4-bb09-4017-97e0-c1028965b94b	2026-05-27 04:34:16.723+00	2026-05-27 04:34:16.723+00
43e5f875-8cc9-4150-a347-e8ced52b4e6a	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Welcome Email	email	Welcome to {{company.name}}!	<h2>Hello {{lead.first_name}}!</h2><p>Thank you for your interest in {{company.name}}. We are thrilled to have you here.</p><p>Your dedicated representative, {{rep.name}}, will be reaching out shortly to understand your needs better.</p><p>In the meantime, feel free to explore our offerings at the link below:</p><p><a href="{{tracking.cta_url}}">Explore Now →</a></p><p>Best regards,<br/>{{rep.name}}<br/>{{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	welcome	t	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.724+00	2026-05-27 04:34:16.724+00
c2d32115-54dc-4999-9f17-da0b049ee14c	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Onboarding Guide	email	Getting Started with {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Welcome aboard! Here's a quick guide to help you get started:</p><ol><li>Review our product catalog</li><li>Schedule a demo call with {{rep.name}}</li><li>Set up your account preferences</li></ol><p><a href="{{tracking.cta_url}}">View Onboarding Guide →</a></p><p>Need help? Reach out to {{rep.name}} at {{rep.email}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	onboarding	t	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.725+00	2026-05-27 04:34:16.725+00
ae369c07-d339-45f7-8ba0-41d08fa3aed4	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Exclusive Discount Offer	email	🎉 Special Offer Just for You, {{lead.first_name}}!	<h2>Hi {{lead.first_name}},</h2><p>We have an exclusive offer waiting for you!</p><p>As a valued prospect of {{company.name}}, we'd like to offer you a <strong>15% discount</strong> on your first purchase.</p><p>This offer expires in 7 days.</p><p><a href="{{tracking.cta_url}}">Claim Your Discount →</a></p><p>Don't miss out!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	discount	t	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.726+00	2026-05-27 04:34:16.726+00
e2635cf2-984c-447d-a44a-09b4b0969a7f	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Post-Purchase Thank You	email	Thank You for Choosing {{company.name}}!	<h2>Congratulations, {{lead.first_name}}! 🎉</h2><p>Your purchase is confirmed. We're so grateful you chose {{company.name}}.</p><p>Here's what happens next:</p><ul><li>You'll receive your order confirmation within 24 hours</li><li>Our team will reach out for onboarding support</li><li>Access your dashboard for updates</li></ul><p>Have questions? Contact {{rep.name}} at {{rep.email}}</p><p>Welcome to the family!<br/>Team {{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	post_purchase	t	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.727+00	2026-05-27 04:34:16.727+00
81871b25-fb5a-40ec-b3bd-72c2203c998a	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Follow-Up Nudge	email	Quick Check-in — {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Just checking in! Did you get a chance to review our brochure?</p><p>I'd love to schedule a quick 15-minute call to discuss how {{company.name}} can help {{lead.company}}.</p><p><a href="{{tracking.cta_url}}">Book a Call →</a></p><p>Looking forward to hearing from you!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	follow_up	t	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.728+00	2026-05-27 04:34:16.728+00
9196be50-6efb-4395-ad7b-8654dbc52ba9	6dc57766-f52a-4f01-a0da-75511fb3f2a1	Re-engagement Email	email	We Miss You, {{lead.first_name}}!	<h2>Hey {{lead.first_name}},</h2><p>It's been a while since we last connected. We've been making great improvements and have some exciting updates to share.</p><p>Would you like to reconnect? Here's what's new:</p><ul><li>New features and products</li><li>Special returning customer benefits</li><li>Updated pricing plans</li></ul><p><a href="{{tracking.cta_url}}">See What's New →</a></p><p>We'd love to have you back!</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	reengagement	t	d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	2026-05-27 04:34:16.73+00	2026-05-27 04:34:16.73+00
89f7d6e4-6e69-4c6d-b4d4-d80782bb1677	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Welcome Email	email	Welcome to {{company.name}}!	<h2>Hello {{lead.first_name}}!</h2><p>Thank you for your interest in {{company.name}}. We are thrilled to have you here.</p><p>Your dedicated representative, {{rep.name}}, will be reaching out shortly to understand your needs better.</p><p>In the meantime, feel free to explore our offerings at the link below:</p><p><a href="{{tracking.cta_url}}">Explore Now →</a></p><p>Best regards,<br/>{{rep.name}}<br/>{{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	welcome	t	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.731+00	2026-05-27 04:34:16.731+00
97019d3e-8c60-4242-a0a4-4ecb335f031a	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Onboarding Guide	email	Getting Started with {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Welcome aboard! Here's a quick guide to help you get started:</p><ol><li>Review our product catalog</li><li>Schedule a demo call with {{rep.name}}</li><li>Set up your account preferences</li></ol><p><a href="{{tracking.cta_url}}">View Onboarding Guide →</a></p><p>Need help? Reach out to {{rep.name}} at {{rep.email}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	onboarding	t	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.732+00	2026-05-27 04:34:16.732+00
2efcbb08-13f7-4313-8c1a-f0b69fec28ea	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Exclusive Discount Offer	email	🎉 Special Offer Just for You, {{lead.first_name}}!	<h2>Hi {{lead.first_name}},</h2><p>We have an exclusive offer waiting for you!</p><p>As a valued prospect of {{company.name}}, we'd like to offer you a <strong>15% discount</strong> on your first purchase.</p><p>This offer expires in 7 days.</p><p><a href="{{tracking.cta_url}}">Claim Your Discount →</a></p><p>Don't miss out!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	discount	t	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.732+00	2026-05-27 04:34:16.732+00
ef80db42-631e-4633-84da-c5ddc3d8c38f	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Post-Purchase Thank You	email	Thank You for Choosing {{company.name}}!	<h2>Congratulations, {{lead.first_name}}! 🎉</h2><p>Your purchase is confirmed. We're so grateful you chose {{company.name}}.</p><p>Here's what happens next:</p><ul><li>You'll receive your order confirmation within 24 hours</li><li>Our team will reach out for onboarding support</li><li>Access your dashboard for updates</li></ul><p>Have questions? Contact {{rep.name}} at {{rep.email}}</p><p>Welcome to the family!<br/>Team {{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	post_purchase	t	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.733+00	2026-05-27 04:34:16.733+00
7212e50b-0735-4e4e-8ceb-9c076fdabdd7	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Follow-Up Nudge	email	Quick Check-in — {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Just checking in! Did you get a chance to review our brochure?</p><p>I'd love to schedule a quick 15-minute call to discuss how {{company.name}} can help {{lead.company}}.</p><p><a href="{{tracking.cta_url}}">Book a Call →</a></p><p>Looking forward to hearing from you!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	follow_up	t	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.734+00	2026-05-27 04:34:16.734+00
518dd27d-336e-425d-a61e-9abf0667b6b3	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	Re-engagement Email	email	We Miss You, {{lead.first_name}}!	<h2>Hey {{lead.first_name}},</h2><p>It's been a while since we last connected. We've been making great improvements and have some exciting updates to share.</p><p>Would you like to reconnect? Here's what's new:</p><ul><li>New features and products</li><li>Special returning customer benefits</li><li>Updated pricing plans</li></ul><p><a href="{{tracking.cta_url}}">See What's New →</a></p><p>We'd love to have you back!</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	reengagement	t	48814013-2438-4831-bf0b-980b5dac7e9c	2026-05-27 04:34:16.735+00	2026-05-27 04:34:16.735+00
8e6b142a-e32a-4078-8429-ebca05c82aa0	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Welcome Email	email	Welcome to {{company.name}}!	<h2>Hello {{lead.first_name}}!</h2><p>Thank you for your interest in {{company.name}}. We are thrilled to have you here.</p><p>Your dedicated representative, {{rep.name}}, will be reaching out shortly to understand your needs better.</p><p>In the meantime, feel free to explore our offerings at the link below:</p><p><a href="{{tracking.cta_url}}">Explore Now →</a></p><p>Best regards,<br/>{{rep.name}}<br/>{{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	welcome	t	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.736+00	2026-05-27 04:34:16.736+00
a3e2d585-cfe7-4c73-8026-8fb35e9782af	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Onboarding Guide	email	Getting Started with {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Welcome aboard! Here's a quick guide to help you get started:</p><ol><li>Review our product catalog</li><li>Schedule a demo call with {{rep.name}}</li><li>Set up your account preferences</li></ol><p><a href="{{tracking.cta_url}}">View Onboarding Guide →</a></p><p>Need help? Reach out to {{rep.name}} at {{rep.email}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	onboarding	t	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.737+00	2026-05-27 04:34:16.737+00
b396d7b2-5a98-40cb-bc7a-f89360f9bbc7	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Exclusive Discount Offer	email	🎉 Special Offer Just for You, {{lead.first_name}}!	<h2>Hi {{lead.first_name}},</h2><p>We have an exclusive offer waiting for you!</p><p>As a valued prospect of {{company.name}}, we'd like to offer you a <strong>15% discount</strong> on your first purchase.</p><p>This offer expires in 7 days.</p><p><a href="{{tracking.cta_url}}">Claim Your Discount →</a></p><p>Don't miss out!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	discount	t	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.738+00	2026-05-27 04:34:16.738+00
f399d6e6-7492-4d3a-bd31-b5556ad6cbd4	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Post-Purchase Thank You	email	Thank You for Choosing {{company.name}}!	<h2>Congratulations, {{lead.first_name}}! 🎉</h2><p>Your purchase is confirmed. We're so grateful you chose {{company.name}}.</p><p>Here's what happens next:</p><ul><li>You'll receive your order confirmation within 24 hours</li><li>Our team will reach out for onboarding support</li><li>Access your dashboard for updates</li></ul><p>Have questions? Contact {{rep.name}} at {{rep.email}}</p><p>Welcome to the family!<br/>Team {{company.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	post_purchase	t	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.739+00	2026-05-27 04:34:16.739+00
b568a117-f46b-40f6-949e-cbc4b71800ec	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Follow-Up Nudge	email	Quick Check-in — {{company.name}}	<h2>Hi {{lead.first_name}},</h2><p>Just checking in! Did you get a chance to review our brochure?</p><p>I'd love to schedule a quick 15-minute call to discuss how {{company.name}} can help {{lead.company}}.</p><p><a href="{{tracking.cta_url}}">Book a Call →</a></p><p>Looking forward to hearing from you!<br/>{{rep.name}}</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	follow_up	t	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.74+00	2026-05-27 04:34:16.74+00
74bb3ae9-cb4f-4e5c-882f-04f80d187cd7	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	Re-engagement Email	email	We Miss You, {{lead.first_name}}!	<h2>Hey {{lead.first_name}},</h2><p>It's been a while since we last connected. We've been making great improvements and have some exciting updates to share.</p><p>Would you like to reconnect? Here's what's new:</p><ul><li>New features and products</li><li>Special returning customer benefits</li><li>Updated pricing plans</li></ul><p><a href="{{tracking.cta_url}}">See What's New →</a></p><p>We'd love to have you back!</p>	{lead.first_name,lead.last_name,lead.company,rep.name,rep.email,company.name,tracking.cta_url}	reengagement	t	61b2339a-fd08-4931-84ac-0ae425e5b173	2026-05-27 04:34:16.74+00	2026-05-27 04:34:16.74+00
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.tenants (id, name, subdomain, vertical_type, plan_tier, is_active, settings, branding, created_at, updated_at) FROM stdin;
00771436-6364-463c-bdcc-1b9d2a23536c	EduVantage Institute	edu	education	enterprise	t	{}	{"logo": "/logo-edu.png", "primary_color": "#4F46E5"}	2026-05-27 04:34:16.62+00	2026-05-27 04:34:16.62+00
97b0c019-7e34-4a24-b82b-d3c3c8b6457a	Prime Realty Group	realestate	real_estate	enterprise	t	{}	{"logo": "/logo-re.png", "primary_color": "#059669"}	2026-05-27 04:34:16.62+00	2026-05-27 04:34:16.62+00
41f6cf1a-6695-4163-a5c3-560d519bac96	BuildCraft Construction	construction	construction	standard	t	{}	{"logo": "/logo-const.png", "primary_color": "#D97706"}	2026-05-27 04:34:16.62+00	2026-05-27 04:34:16.62+00
6dc57766-f52a-4f01-a0da-75511fb3f2a1	TechNova IT Solutions	itservices	it_services	enterprise	t	{}	{"logo": "/logo-it.png", "primary_color": "#7C3AED"}	2026-05-27 04:34:16.62+00	2026-05-27 04:34:16.62+00
026e6a63-e47b-4b5a-bf54-a14ffaa47f40	AutoParts Express	autoparts	auto_parts	standard	t	{}	{"logo": "/logo-auto.png", "primary_color": "#DC2626"}	2026-05-27 04:34:16.62+00	2026-05-27 04:34:16.62+00
3e13e16a-cbf6-4a40-b1b8-b29041333bc9	CleanAir IoT	iotaqi	iot_aqi	enterprise	t	{}	{"logo": "/logo-iot.png", "primary_color": "#0891B2"}	2026-05-27 04:34:16.62+00	2026-05-27 04:34:16.62+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: nexcrm
--

COPY public.users (id, tenant_id, email, password_hash, first_name, last_name, role, phone, territory, rep_tags, connected_gmail, is_active, mfa_enabled, mfa_secret, failed_login_attempts, locked_until, last_login, created_at, updated_at) FROM stdin;
9d4dbc0b-f257-4207-a29a-d5f83385df61	00771436-6364-463c-bdcc-1b9d2a23536c	manager@edu.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Sales	Manager	sales_manager	+91-9876543211	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.635+00	2026-05-27 04:34:16.635+00
b21a3b1a-d158-4c0c-9e8b-ee59b1f74b32	00771436-6364-463c-bdcc-1b9d2a23536c	senior@edu.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Senior	Rep	senior_sales_rep	+91-9876543212	\N	{enterprise,luxury}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.635+00	2026-05-27 04:34:16.635+00
ec160ad3-23b5-4373-bb10-153414f8a39f	00771436-6364-463c-bdcc-1b9d2a23536c	rep1@edu.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Rahul	Sharma	sales_rep	+91-9876543213	Mumbai	{retail}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.635+00	2026-05-27 04:34:16.635+00
a89a196e-f263-4380-924c-caa51edbb75b	00771436-6364-463c-bdcc-1b9d2a23536c	rep2@edu.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Priya	Patel	sales_rep	+91-9876543214	Delhi	{online}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.635+00	2026-05-27 04:34:16.635+00
58877d15-7397-4822-b42f-5de2034d64c1	00771436-6364-463c-bdcc-1b9d2a23536c	rep3@edu.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Amit	Kumar	sales_rep	+91-9876543215	Bangalore	{b2b}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.635+00	2026-05-27 04:34:16.635+00
32970239-a684-4e3d-8a79-ed018d3ea83a	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	admin@realestate.nexcrm.io	$2a$12$T5Orfbwe5wEuMKOnpxwAYeQk0/ENnWwWHzRSKAG0.HIgguuJ.H2xK	Admin	Prime	tenant_admin	+91-9876543210	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.638+00	2026-05-27 04:34:16.638+00
2d980b22-4422-45e0-89ec-643e0629b29f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	manager@realestate.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Sales	Manager	sales_manager	+91-9876543211	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.638+00	2026-05-27 04:34:16.638+00
78cc2e55-bd33-4175-ab8f-e16c759b0edf	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	senior@realestate.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Senior	Rep	senior_sales_rep	+91-9876543212	\N	{enterprise,luxury}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.638+00	2026-05-27 04:34:16.638+00
0c3bea60-ceaa-4e4b-ad54-394bdefde7c3	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	rep1@realestate.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Rahul	Sharma	sales_rep	+91-9876543213	Mumbai	{retail}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.638+00	2026-05-27 04:34:16.638+00
997e9379-ef00-4201-a1c4-0f1248a3308f	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	rep2@realestate.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Priya	Patel	sales_rep	+91-9876543214	Delhi	{online}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.638+00	2026-05-27 04:34:16.638+00
9bcbbac3-88bc-4769-9ff2-e7da4d71adb1	97b0c019-7e34-4a24-b82b-d3c3c8b6457a	rep3@realestate.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Amit	Kumar	sales_rep	+91-9876543215	Bangalore	{b2b}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.638+00	2026-05-27 04:34:16.638+00
71f133b4-bb09-4017-97e0-c1028965b94b	41f6cf1a-6695-4163-a5c3-560d519bac96	admin@construction.nexcrm.io	$2a$12$T5Orfbwe5wEuMKOnpxwAYeQk0/ENnWwWHzRSKAG0.HIgguuJ.H2xK	Admin	BuildCraft	tenant_admin	+91-9876543210	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.64+00	2026-05-27 04:34:16.64+00
2c0daba0-e48a-482d-b413-56af19c353c5	41f6cf1a-6695-4163-a5c3-560d519bac96	manager@construction.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Sales	Manager	sales_manager	+91-9876543211	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.64+00	2026-05-27 04:34:16.64+00
c63e9809-1fe7-4f6e-b2d3-d7f79dafbfa9	41f6cf1a-6695-4163-a5c3-560d519bac96	senior@construction.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Senior	Rep	senior_sales_rep	+91-9876543212	\N	{enterprise,luxury}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.64+00	2026-05-27 04:34:16.64+00
99da393e-4325-43a7-80fe-94bc069e268e	41f6cf1a-6695-4163-a5c3-560d519bac96	rep1@construction.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Rahul	Sharma	sales_rep	+91-9876543213	Mumbai	{retail}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.64+00	2026-05-27 04:34:16.64+00
b7137009-50c3-4830-8857-a104cfb92ace	41f6cf1a-6695-4163-a5c3-560d519bac96	rep2@construction.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Priya	Patel	sales_rep	+91-9876543214	Delhi	{online}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.64+00	2026-05-27 04:34:16.64+00
73f31cb0-ccd5-4aa0-82d2-9d9a759dd504	41f6cf1a-6695-4163-a5c3-560d519bac96	rep3@construction.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Amit	Kumar	sales_rep	+91-9876543215	Bangalore	{b2b}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.64+00	2026-05-27 04:34:16.64+00
d51a5444-ccb0-46a2-b3a9-f48e3f0b46ec	6dc57766-f52a-4f01-a0da-75511fb3f2a1	admin@itservices.nexcrm.io	$2a$12$T5Orfbwe5wEuMKOnpxwAYeQk0/ENnWwWHzRSKAG0.HIgguuJ.H2xK	Admin	TechNova	tenant_admin	+91-9876543210	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.642+00	2026-05-27 04:34:16.642+00
5d2106aa-2f72-4dfc-9406-07d6451a564b	6dc57766-f52a-4f01-a0da-75511fb3f2a1	manager@itservices.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Sales	Manager	sales_manager	+91-9876543211	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.642+00	2026-05-27 04:34:16.642+00
83d2e135-26eb-4dc7-88e7-82847bb6b872	6dc57766-f52a-4f01-a0da-75511fb3f2a1	senior@itservices.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Senior	Rep	senior_sales_rep	+91-9876543212	\N	{enterprise,luxury}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.642+00	2026-05-27 04:34:16.642+00
27a52843-fa9c-46e3-8484-acdd16c10942	6dc57766-f52a-4f01-a0da-75511fb3f2a1	rep1@itservices.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Rahul	Sharma	sales_rep	+91-9876543213	Mumbai	{retail}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.642+00	2026-05-27 04:34:16.642+00
31688bb9-b854-44dd-a367-0c23ae743840	6dc57766-f52a-4f01-a0da-75511fb3f2a1	rep2@itservices.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Priya	Patel	sales_rep	+91-9876543214	Delhi	{online}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.642+00	2026-05-27 04:34:16.642+00
16754d06-eee8-43a7-9bea-ff6d9bc1f3a1	6dc57766-f52a-4f01-a0da-75511fb3f2a1	rep3@itservices.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Amit	Kumar	sales_rep	+91-9876543215	Bangalore	{b2b}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.642+00	2026-05-27 04:34:16.642+00
48814013-2438-4831-bf0b-980b5dac7e9c	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	admin@autoparts.nexcrm.io	$2a$12$T5Orfbwe5wEuMKOnpxwAYeQk0/ENnWwWHzRSKAG0.HIgguuJ.H2xK	Admin	AutoParts	tenant_admin	+91-9876543210	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.644+00	2026-05-27 04:34:16.644+00
347371d3-7f1e-4eb6-8240-29ee12ae5d47	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	manager@autoparts.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Sales	Manager	sales_manager	+91-9876543211	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.644+00	2026-05-27 04:34:16.644+00
cad53572-0214-411a-b424-ff44af446154	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	senior@autoparts.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Senior	Rep	senior_sales_rep	+91-9876543212	\N	{enterprise,luxury}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.644+00	2026-05-27 04:34:16.644+00
0c4d2635-dfdd-4043-8104-14fcdbdd4270	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	rep1@autoparts.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Rahul	Sharma	sales_rep	+91-9876543213	Mumbai	{retail}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.644+00	2026-05-27 04:34:16.644+00
2a7931a8-8ee6-4365-85d0-b40109a3ed68	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	rep2@autoparts.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Priya	Patel	sales_rep	+91-9876543214	Delhi	{online}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.644+00	2026-05-27 04:34:16.644+00
26a7fef0-3396-473f-8e2b-206de0ae49fa	026e6a63-e47b-4b5a-bf54-a14ffaa47f40	rep3@autoparts.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Amit	Kumar	sales_rep	+91-9876543215	Bangalore	{b2b}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.644+00	2026-05-27 04:34:16.644+00
61b2339a-fd08-4931-84ac-0ae425e5b173	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	admin@iotaqi.nexcrm.io	$2a$12$T5Orfbwe5wEuMKOnpxwAYeQk0/ENnWwWHzRSKAG0.HIgguuJ.H2xK	Admin	CleanAir	tenant_admin	+91-9876543210	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.646+00	2026-05-27 04:34:16.646+00
a8773f3e-cc24-4215-9923-f8b7866d8a68	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	manager@iotaqi.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Sales	Manager	sales_manager	+91-9876543211	\N	{}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.646+00	2026-05-27 04:34:16.646+00
167b2073-5282-4e24-a2ec-aec095b710c5	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	senior@iotaqi.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Senior	Rep	senior_sales_rep	+91-9876543212	\N	{enterprise,luxury}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.646+00	2026-05-27 04:34:16.646+00
7b4e256c-5bc3-476b-9a5a-8dd1e6d6afbc	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	rep1@iotaqi.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Rahul	Sharma	sales_rep	+91-9876543213	Mumbai	{retail}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.646+00	2026-05-27 04:34:16.646+00
6b847887-5207-409a-b399-32349070edc9	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	rep2@iotaqi.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Priya	Patel	sales_rep	+91-9876543214	Delhi	{online}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.646+00	2026-05-27 04:34:16.646+00
53dcddee-6bbe-4d96-b8a3-01b09e9be315	3e13e16a-cbf6-4a40-b1b8-b29041333bc9	rep3@iotaqi.nexcrm.io	$2a$12$10gREHZraaSha6rMyYFL4.Y9au0uBlgtv2iuCLB9jXllx0qUYtLkW	Amit	Kumar	sales_rep	+91-9876543215	Bangalore	{b2b}	\N	t	f	\N	0	\N	\N	2026-05-27 04:34:16.646+00	2026-05-27 04:34:16.646+00
f68724fe-eee5-45f6-b1ac-63a1b1ca22bb	00771436-6364-463c-bdcc-1b9d2a23536c	superadmin@nexcrm.io	$2a$12$T5Orfbwe5wEuMKOnpxwAYeQk0/ENnWwWHzRSKAG0.HIgguuJ.H2xK	Super	Admin	super_admin	+91-9000000000	\N	{}	\N	t	t	\N	0	\N	\N	2026-05-27 04:34:16.648+00	2026-05-27 04:34:16.648+00
d6d93084-1ba0-4f86-a41a-aa2b9260bf1d	00771436-6364-463c-bdcc-1b9d2a23536c	admin@edu.nexcrm.io	$2a$12$T5Orfbwe5wEuMKOnpxwAYeQk0/ENnWwWHzRSKAG0.HIgguuJ.H2xK	Admin	EduVantage	tenant_admin	+91-9876543210	\N	{}	\N	t	f	\N	0	\N	2026-05-27 04:40:46.712+00	2026-05-27 04:34:16.635+00	2026-05-27 04:40:46.712+00
\.


--
-- Name: application_types application_types_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.application_types
    ADD CONSTRAINT application_types_pkey PRIMARY KEY (id);


--
-- Name: asset_folders asset_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.asset_folders
    ADD CONSTRAINT asset_folders_pkey PRIMARY KEY (id);


--
-- Name: asset_projects asset_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.asset_projects
    ADD CONSTRAINT asset_projects_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: engagement_events engagement_events_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.engagement_events
    ADD CONSTRAINT engagement_events_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: nurturing_settings nurturing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.nurturing_settings
    ADD CONSTRAINT nurturing_settings_pkey PRIMARY KEY (id);


--
-- Name: nurturing_settings nurturing_settings_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.nurturing_settings
    ADD CONSTRAINT nurturing_settings_tenant_id_key UNIQUE (tenant_id);


--
-- Name: outreach_records outreach_records_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.outreach_records
    ADD CONSTRAINT outreach_records_pkey PRIMARY KEY (id);


--
-- Name: routing_rules routing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.routing_rules
    ADD CONSTRAINT routing_rules_pkey PRIMARY KEY (id);


--
-- Name: scoring_profiles scoring_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.scoring_profiles
    ADD CONSTRAINT scoring_profiles_pkey PRIMARY KEY (id);


--
-- Name: sequence_enrollments sequence_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.sequence_enrollments
    ADD CONSTRAINT sequence_enrollments_pkey PRIMARY KEY (id);


--
-- Name: sequences sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT sequences_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_subdomain_key UNIQUE (subdomain);


--
-- Name: tenants tenants_subdomain_key1; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_subdomain_key1 UNIQUE (subdomain);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: assets_tenant_id_folder_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX assets_tenant_id_folder_id ON public.assets USING btree (tenant_id, folder_id);


--
-- Name: audit_logs_created_at; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_tenant_id_actor_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX audit_logs_tenant_id_actor_id ON public.audit_logs USING btree (tenant_id, actor_id);


--
-- Name: audit_logs_tenant_id_entity_type; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX audit_logs_tenant_id_entity_type ON public.audit_logs USING btree (tenant_id, entity_type);


--
-- Name: engagement_events_created_at; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX engagement_events_created_at ON public.engagement_events USING btree (created_at);


--
-- Name: engagement_events_tenant_id_event_type; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX engagement_events_tenant_id_event_type ON public.engagement_events USING btree (tenant_id, event_type);


--
-- Name: engagement_events_tenant_id_lead_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX engagement_events_tenant_id_lead_id ON public.engagement_events USING btree (tenant_id, lead_id);


--
-- Name: leads_tenant_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX leads_tenant_id ON public.leads USING btree (tenant_id);


--
-- Name: leads_tenant_id_assigned_rep_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX leads_tenant_id_assigned_rep_id ON public.leads USING btree (tenant_id, assigned_rep_id);


--
-- Name: leads_tenant_id_email; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX leads_tenant_id_email ON public.leads USING btree (tenant_id, email);


--
-- Name: leads_tenant_id_lead_type; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX leads_tenant_id_lead_type ON public.leads USING btree (tenant_id, lead_type);


--
-- Name: leads_tenant_id_score; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX leads_tenant_id_score ON public.leads USING btree (tenant_id, score);


--
-- Name: leads_tenant_id_status; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX leads_tenant_id_status ON public.leads USING btree (tenant_id, status);


--
-- Name: outreach_records_tenant_id_lead_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX outreach_records_tenant_id_lead_id ON public.outreach_records USING btree (tenant_id, lead_id);


--
-- Name: outreach_records_tenant_id_status; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX outreach_records_tenant_id_status ON public.outreach_records USING btree (tenant_id, status);


--
-- Name: outreach_records_tracking_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX outreach_records_tracking_id ON public.outreach_records USING btree (tracking_id);


--
-- Name: routing_rules_tenant_id_priority; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX routing_rules_tenant_id_priority ON public.routing_rules USING btree (tenant_id, priority);


--
-- Name: sequence_enrollments_status_next_step_at; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX sequence_enrollments_status_next_step_at ON public.sequence_enrollments USING btree (status, next_step_at);


--
-- Name: sequence_enrollments_tenant_id_lead_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX sequence_enrollments_tenant_id_lead_id ON public.sequence_enrollments USING btree (tenant_id, lead_id);


--
-- Name: templates_tenant_id_category; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE INDEX templates_tenant_id_category ON public.templates USING btree (tenant_id, category);


--
-- Name: users_email_tenant_id; Type: INDEX; Schema: public; Owner: nexcrm
--

CREATE UNIQUE INDEX users_email_tenant_id ON public.users USING btree (email, tenant_id);


--
-- Name: application_types application_types_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.application_types
    ADD CONSTRAINT application_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_folders asset_folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.asset_folders
    ADD CONSTRAINT asset_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.asset_folders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_folders asset_folders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.asset_folders
    ADD CONSTRAINT asset_folders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.asset_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_projects asset_projects_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.asset_projects
    ADD CONSTRAINT asset_projects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets assets_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.asset_folders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE;


--
-- Name: engagement_events engagement_events_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.engagement_events
    ADD CONSTRAINT engagement_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leads leads_application_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_application_type_id_fkey FOREIGN KEY (application_type_id) REFERENCES public.application_types(id) ON UPDATE CASCADE;


--
-- Name: leads leads_assigned_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_rep_id_fkey FOREIGN KEY (assigned_rep_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leads leads_enrolled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_enrolled_by_fkey FOREIGN KEY (enrolled_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leads leads_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: nurturing_settings nurturing_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.nurturing_settings
    ADD CONSTRAINT nurturing_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: outreach_records outreach_records_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.outreach_records
    ADD CONSTRAINT outreach_records_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: outreach_records outreach_records_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.outreach_records
    ADD CONSTRAINT outreach_records_rep_id_fkey FOREIGN KEY (rep_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: outreach_records outreach_records_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.outreach_records
    ADD CONSTRAINT outreach_records_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON UPDATE CASCADE;


--
-- Name: routing_rules routing_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.routing_rules
    ADD CONSTRAINT routing_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scoring_profiles scoring_profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.scoring_profiles
    ADD CONSTRAINT scoring_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sequence_enrollments sequence_enrollments_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.sequence_enrollments
    ADD CONSTRAINT sequence_enrollments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sequence_enrollments sequence_enrollments_sequence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.sequence_enrollments
    ADD CONSTRAINT sequence_enrollments_sequence_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.sequences(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sequences sequences_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT sequences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: templates templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: templates templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nexcrm
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict pYhLYskjIWr5H4xdbbrrbIH1uoVo1gOWl38io42dtiynrkB82wv27awrHQhVFZs

