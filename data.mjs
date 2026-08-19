import { getStore } from '@netlify/blobs';

const DEFAULT_DASHBOARD_CARDS = {
  totalExams: { label: 'মোট পরীক্ষা', visible: true },
  upcomingExams: { label: 'আসন্ন পরীক্ষা', visible: true },
  thisMonthExams: { label: 'এই মাসের আসন্ন পরীক্ষা', visible: true },
  totalMarks: { label: 'মোট প্রাপ্ত নম্বর (প্রাপ্ত/মোট)', visible: true },
  avgRank: { label: 'সেন্ট্রাল র‍্যাঙ্ক (গড়)', visible: true },
  totalWrong: { label: 'মোট ভুল উত্তর', visible: true },
  totalCorrect: { label: 'মোট ঠিক উত্তর', visible: true },
  totalAdmission: { label: 'মোট এডমিশন পরীক্ষা', visible: true },
  pastExams: { label: 'সমাপ্ত পরীক্ষা', visible: true },
  avgPercent: { label: 'গড় প্রাপ্ত নম্বর (%)', visible: true },
  bestRank: { label: 'সর্বোচ্চ কেন্দ্রীয় র‍্যাঙ্ক', visible: true }
};

const DEFAULT_STATE = {
  events: [],
  gaps: [],
  vuls: [],
  siteText: {
    brandTitle: 'NextGate',
    brandSubtitle: 'পরীক্ষা ট্র্যাকার',
    pageTitle: 'NextGate — পরীক্ষা ট্র্যাকার',
    addBtnLabel: 'নতুন পরীক্ষা যোগ করুন',
    calHeading: 'ক্যালেন্ডার',
    eventsHeadingDashboard: 'আসন্ন পরীক্ষাসমূহ',
    eventsHeadingAll: 'সব পরীক্ষা',
    eventsHeadingCalNoDate: 'একটি তারিখ নির্বাচন করুন',
    eventsHeadingCalDate: 'নির্বাচিত দিনের পরীক্ষা',
    statTotalLabel: 'মোট পরীক্ষা',
    statSoonLabel: '৭ দিনের মধ্যে',
    statMonthLabel: 'এই মাসে',
    statPastLabel: 'সমাপ্ত পরীক্ষা',
    primaryColor: '#D9333F',
    greetingOverride: '',
    dashboardCards: DEFAULT_DASHBOARD_CARDS
  },
  tagColors: {},
  customQuotes: []
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async (req) => {
  try {
    const store = getStore({ name: 'nextgate-data', consistency: 'strong' });

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method === 'GET') {
      let data = null;
      try {
        data = await store.get('state', { type: 'json' });
      } catch (e) {
        data = null;
      }
      return new Response(JSON.stringify(data || DEFAULT_STATE), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate', ...CORS_HEADERS }
      });
    }

    if (req.method === 'POST') {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        return new Response(
          JSON.stringify({ error: 'ADMIN_PASSWORD env var is not set on the server. Add it in Netlify: Site configuration → Environment variables, then redeploy.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (token !== adminPassword) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }

      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body: ' + e.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }

      // Ensure dashboardCards is preserved
      const safeSiteText = (body.siteText && typeof body.siteText === 'object') ? body.siteText : DEFAULT_STATE.siteText;
      if (!safeSiteText.dashboardCards) {
        safeSiteText.dashboardCards = DEFAULT_STATE.siteText.dashboardCards;
      }

      const safeState = {
        events: Array.isArray(body.events) ? body.events : [],
        gaps: Array.isArray(body.gaps) ? body.gaps : [],
        vuls: Array.isArray(body.vuls) ? body.vuls : [],
        siteText: safeSiteText,
        tagColors: (body.tagColors && typeof body.tagColors === 'object') ? body.tagColors : {},
        customQuotes: Array.isArray(body.customQuotes) ? body.customQuotes : []
      };

      await store.setJSON('state', safeState);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  } catch (fatalError) {
    return new Response(
      JSON.stringify({ error: 'Function crashed: ' + (fatalError && fatalError.message ? fatalError.message : String(fatalError)) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
};
