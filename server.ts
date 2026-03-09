import 'dotenv/config';
import express from 'express';
import Parser from 'rss-parser';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const PORT = 3000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.APP_URL || 'http://localhost:3000' : '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] A client connected: ${socket.id}`);

  // Dummy heartbeat interval to mock live threat events
  const heartbeat = setInterval(() => {
    // Broadcast test SSE payload
    socket.emit('new_threat_event', {
      id: crypto.randomUUID(),
      title: 'Mock Live Threat Activity',
      timestamp: new Date().toISOString()
    });
  }, 30000);

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    clearInterval(heartbeat);
  });
});

const parser = new Parser({
  timeout: 3000,
  headers: { 'User-Agent': 'PulseMap/1.0 (news aggregator)' },
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure', 'image'],
  },
});

// -- Supabase client for server-side persistence --
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Using anon key for simple upserts if RLS permits, or service role if needed
const supabase = createClient(supabaseUrl, supabaseKey);

// Fast-mode feed subset: most reliable sources for quick initial load on mobile
// Used when ?fast=1 is passed — reduces cold-start from ~20s to ~3-5s
const FAST_FEED_NAMES = new Set([
  // Major global news
  'BBC News World',
  'BBC News Middle East',
  'BBC News Europe',
  'BBC News Asia',
  'BBC News Africa',
  'BBC News USA',
  'DW World Top',
  'DW World News',
  'Al Jazeera World',
  'AP News World',
  // Key conflict regions (high-reliability Google News)
  'Ukraine Combat Intel',
  'Russia Conflict Monitor',
  'Gaza Security',
  'Israel Security',
  'Yemen Combat Intel',
  'Syria Crisis Monitor',
  'Sudan Crisis',
  'DRC Crisis',
  'Global Armed Conflict',
  'Global Terror Monitor',
  // Defense / OSINT
  'USNI News',
  'Defense News',
  'TWZ All',
  'DVIDS News',
  // UN
  'UN Peace & Security',
]);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production' ? process.env.APP_URL || 'http://localhost:3000' : true,
  })
);
app.use(express.json());

const FEEDS = [
  // ── REGIONAL INTELLIGENCE: MIDDLE EAST ──
  {
    name: 'Bahrain Monitor',
    url: 'https://news.google.com/rss/search?q=Bahrain%20(protest%20OR%20unrest%20OR%20security%20OR%20attack%20OR%20arrest%20OR%20sanctions)&hl=en&gl=BH&ceid=BH:en',
    region: 'Middle East',
  },
  {
    name: 'Egypt Security Focus',
    url: 'https://news.google.com/rss/search?q=Egypt%20(Sinai%20OR%20border%20OR%20protest%20OR%20attack%20OR%20security%20OR%20Gaza%20OR%20ceasefire)&hl=en&gl=EG&ceid=EG:en',
    region: 'Middle East',
  },
  {
    name: 'Jordan Border Intel',
    url: 'https://news.google.com/rss/search?q=Jordan%20(border%20OR%20attack%20OR%20protest%20OR%20security%20OR%20Gaza%20OR%20ceasefire)&hl=en&gl=JO&ceid=JO:en',
    region: 'Middle East',
  },
  {
    name: 'Kuwait Security Monitor',
    url: 'https://news.google.com/rss/search?q=Kuwait%20(diplomacy%20OR%20security%20OR%20sanctions%20OR%20talks%20OR%20ceasefire)&hl=en&gl=KW&ceid=KW:en',
    region: 'Middle East',
  },
  {
    name: 'Oman Mediation Intel',
    url: 'https://news.google.com/rss/search?q=Oman%20(mediation%20OR%20talks%20OR%20ceasefire%20OR%20diplomacy%20OR%20security)&hl=en&gl=OM&ceid=OM:en',
    region: 'Middle East',
  },
  {
    name: 'Saudi Security Monitor',
    url: 'https://news.google.com/rss/search?q=Saudi%20Arabia%20(Yemen%20OR%20Red%20Sea%20OR%20missile%20OR%20security%20OR%20talks%20OR%20ceasefire)&hl=en&gl=SA&ceid=SA:en',
    region: 'Middle East',
  },
  {
    name: 'UAE Diplomatic Intel',
    url: 'https://news.google.com/rss/search?q=UAE%20(diplomacy%20OR%20talks%20OR%20security%20OR%20sanctions%20OR%20ceasefire)&hl=en&gl=AE&ceid=AE:en',
    region: 'Middle East',
  },
  {
    name: 'Qatar Mediation Intel',
    url: 'https://news.google.com/rss/search?q=Qatar%20(mediation%20OR%20talks%20OR%20ceasefire%20OR%20hostages%20OR%20diplomacy%20OR%20sanctions)&hl=en&gl=QA&ceid=QA:en',
    region: 'Middle East',
  },
  {
    name: 'Lebanon Strike Intel',
    url: 'https://news.google.com/rss/search?q=Lebanon%20(strike%20OR%20airstrike%20OR%20Hezbollah%20OR%20missile%20OR%20border%20OR%20ceasefire)&hl=en&gl=LB&ceid=LB:en',
    region: 'Middle East',
  },
  {
    name: 'Syria Crisis Monitor',
    url: 'https://news.google.com/rss/search?q=Syria%20(airstrike%20OR%20shelling%20OR%20drone%20OR%20ISIS%20OR%20evacuation%20OR%20humanitarian%20OR%20aid%20OR%20ceasefire)&hl=en&gl=SY&ceid=SY:en',
    region: 'Middle East',
  },
  {
    name: 'Yemen Combat Intel',
    url: 'https://news.google.com/rss/search?q=Yemen%20(Houthis%20OR%20airstrike%20OR%20missile%20OR%20Red%20Sea%20OR%20shipping%20OR%20humanitarian%20OR%20ceasefire)&hl=en&gl=YE&ceid=YE:en',
    region: 'Middle East',
  },

  // ── REGIONAL INTELLIGENCE: EUROPE ──
  {
    name: 'Belarus Border Intel',
    url: 'https://news.google.com/rss/search?q=Belarus%20(border%20OR%20sanctions%20OR%20protest%20OR%20security%20OR%20detention)&hl=en&gl=BY&ceid=BY:en',
    region: 'Europe / UKR',
  },
  {
    name: 'Poland Security Monitor',
    url: 'https://news.google.com/rss/search?q=Poland%20(border%20OR%20security%20OR%20protest%20OR%20unrest%20OR%20attack)&hl=pl&gl=PL&ceid=PL:pl',
    region: 'Europe / UKR',
  },
  {
    name: 'Moldova Security Intel',
    url: 'https://news.google.com/rss/search?q=Moldova%20(Russia%20OR%20Transnistria%20OR%20security%20OR%20protest%20OR%20unrest)&hl=en&gl=MD&ceid=MD:en',
    region: 'Europe / UKR',
  },
  {
    name: 'Baltic Monitor (Latvia)',
    url: 'https://news.google.com/rss/search?q=Latvia%20(Russia%20OR%20border%20OR%20security%20OR%20protest)&hl=lv&gl=LV&ceid=LV:lv',
    region: 'Europe / UKR',
  },
  {
    name: 'Baltic Monitor (Estonia)',
    url: 'https://news.google.com/rss/search?q=Estonia%20(Russia%20OR%20border%20OR%20security%20OR%20protest)&hl=et&gl=EE&ceid=EE:et',
    region: 'Europe / UKR',
  },
  {
    name: 'Baltic Monitor (Lithuania)',
    url: 'https://news.google.com/rss/search?q=Lithuania%20(Russia%20OR%20border%20OR%20security%20OR%20protest)&hl=lt&gl=LT&ceid=LT:lt',
    region: 'Europe / UKR',
  },
  {
    name: 'Finland security Intel',
    url: 'https://news.google.com/rss/search?q=Finland%20(Russia%20OR%20border%20OR%20security%20OR%20attack%20OR%20protest)&hl=fi&gl=FI&ceid=FI:fi',
    region: 'Europe / UKR',
  },
  {
    name: 'Greece-Turkey Monitor',
    url: 'https://news.google.com/rss/search?q=Greece%20(Turkey%20OR%20border%20OR%20protest%20OR%20unrest%20OR%20security)&hl=el&gl=GR&ceid=GR:el',
    region: 'Europe / UKR',
  },
  {
    name: 'Ukraine Combat Intel',
    url: 'https://news.google.com/rss/search?q=Ukraine%20(drone%20OR%20missile%20OR%20airstrike%20OR%20frontline%20OR%20Kharkiv%20OR%20Odesa%20OR%20ceasefire)&hl=en&gl=UA&ceid=UA:en',
    region: 'Europe / UKR',
  },
  {
    name: 'Russia Conflict Monitor',
    url: 'https://news.google.com/rss/search?q=Russia%20(sanctions%20OR%20mobilization%20OR%20missile%20OR%20drone%20OR%20ceasefire%20OR%20border)&hl=en&gl=RU&ceid=RU:en',
    region: 'Europe / UKR',
  },

  // ── REGIONAL INTELLIGENCE: ASIA ──
  {
    name: 'Afghanistan Top',
    url: 'https://news.google.com/rss?hl=en&gl=AF&ceid=AF:en',
    region: 'Asia',
  },
  {
    name: 'Afghanistan Crisis',
    url: 'https://news.google.com/rss/search?q=Afghanistan%20(attack%20OR%20ISIS%20OR%20Taliban%20OR%20border%20OR%20protest%20OR%20unrest%20OR%20humanitarian)&hl=en&gl=AF&ceid=AF:en',
    region: 'Asia',
  },
  {
    name: 'Armenia Top',
    url: 'https://news.google.com/rss?hl=en&gl=AM&ceid=AM:en',
    region: 'Asia',
  },
  {
    name: 'Armenia Crisis',
    url: 'https://news.google.com/rss/search?q=Armenia%20(Azerbaijan%20OR%20border%20OR%20clashes%20OR%20Karabakh%20OR%20security%20OR%20unrest)&hl=en&gl=AM&ceid=AM:en',
    region: 'Asia',
  },
  {
    name: 'Azerbaijan Top',
    url: 'https://news.google.com/rss?hl=en&gl=AZ&ceid=AZ:en',
    region: 'Asia',
  },
  {
    name: 'Azerbaijan Crisis',
    url: 'https://news.google.com/rss/search?q=Azerbaijan%20(Armenia%20OR%20border%20OR%20clashes%20OR%20Karabakh%20OR%20security%20OR%20unrest)&hl=en&gl=AZ&ceid=AZ:en',
    region: 'Asia',
  },
  {
    name: 'Bangladesh Top',
    url: 'https://news.google.com/rss?hl=en&gl=BD&ceid=BD:en',
    region: 'Asia',
  },
  {
    name: 'Bangladesh Crisis',
    url: 'https://news.google.com/rss/search?q=Bangladesh%20(protest%20OR%20unrest%20OR%20strike%20OR%20violence%20OR%20election%20OR%20security)&hl=en&gl=BD&ceid=BD:en',
    region: 'Asia',
  },
  {
    name: 'Cambodia Top',
    url: 'https://news.google.com/rss?hl=en&gl=KH&ceid=KH:en',
    region: 'Asia',
  },
  {
    name: 'Cambodia Crisis',
    url: 'https://news.google.com/rss/search?q=Cambodia%20(protest%20OR%20unrest%20OR%20border%20OR%20security%20OR%20attack)&hl=en&gl=KH&ceid=KH:en',
    region: 'Asia',
  },
  { name: 'China Top', url: 'https://news.google.com/rss?hl=en&gl=CN&ceid=CN:en', region: 'Asia' },
  {
    name: 'China Crisis',
    url: 'https://news.google.com/rss/search?q=China%20(Taiwan%20OR%20%22South%20China%20Sea%22%20OR%20sanctions%20OR%20military%20exercise%20OR%20border%20OR%20security)&hl=en&gl=CN&ceid=CN:en',
    region: 'Asia',
  },
  {
    name: 'Georgia Top',
    url: 'https://news.google.com/rss?hl=en&gl=GE&ceid=GE:en',
    region: 'Asia',
  },
  {
    name: 'Georgia Crisis',
    url: 'https://news.google.com/rss/search?q=Georgia%20(protest%20OR%20unrest%20OR%20security%20OR%20border%20OR%20Russia)&hl=en&gl=GE&ceid=GE:en',
    region: 'Asia',
  },
  {
    name: 'Hong Kong Top',
    url: 'https://news.google.com/rss?hl=en&gl=HK&ceid=HK:en',
    region: 'Asia',
  },
  {
    name: 'Hong Kong Crisis',
    url: 'https://news.google.com/rss/search?q=%22Hong%20Kong%22%20(protest%20OR%20security%20OR%20arrest%20OR%20unrest)&hl=en&gl=HK&ceid=HK:en',
    region: 'Asia',
  },
  { name: 'India Top', url: 'https://news.google.com/rss?hl=en&gl=IN&ceid=IN:en', region: 'Asia' },
  {
    name: 'India Crisis',
    url: 'https://news.google.com/rss/search?q=India%20(attack%20OR%20blast%20OR%20Kashmir%20OR%20border%20OR%20militant%20OR%20terror%20OR%20protest%20OR%20riot)&hl=en&gl=IN&ceid=IN:en',
    region: 'Asia',
  },
  {
    name: 'Indonesia Top',
    url: 'https://news.google.com/rss?hl=en&gl=ID&ceid=ID:en',
    region: 'Asia',
  },
  {
    name: 'Indonesia Crisis',
    url: 'https://news.google.com/rss/search?q=Indonesia%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20Papua%20OR%20terror)&hl=en&gl=ID&ceid=ID:en',
    region: 'Asia',
  },
  { name: 'Japan Top', url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', region: 'Asia' },
  {
    name: 'Japan Crisis',
    url: 'https://news.google.com/rss/search?q=Japan%20(North%20Korea%20OR%20missile%20OR%20Taiwan%20OR%20China%20OR%20security%20OR%20attack)&hl=en&gl=JP&ceid=JP:en',
    region: 'Asia',
  },
  {
    name: 'Kazakhstan Top',
    url: 'https://news.google.com/rss?hl=en&gl=KZ&ceid=KZ:en',
    region: 'Asia',
  },
  {
    name: 'Kazakhstan Crisis',
    url: 'https://news.google.com/rss/search?q=Kazakhstan%20(protest%20OR%20unrest%20OR%20security%20OR%20border%20OR%20attack)&hl=en&gl=KZ&ceid=KZ:en',
    region: 'Asia',
  },
  {
    name: 'Kyrgyzstan Top',
    url: 'https://news.google.com/rss?hl=en&gl=KG&ceid=KG:en',
    region: 'Asia',
  },
  {
    name: 'Kyrgyzstan Crisis',
    url: 'https://news.google.com/rss/search?q=Kyrgyzstan%20(protest%20OR%20unrest%20OR%20border%20OR%20security%20OR%20attack)&hl=en&gl=KG&ceid=KG:en',
    region: 'Asia',
  },
  { name: 'Laos Top', url: 'https://news.google.com/rss?hl=en&gl=LA&ceid=LA:en', region: 'Asia' },
  {
    name: 'Laos Crisis',
    url: 'https://news.google.com/rss/search?q=Laos%20(protest%20OR%20unrest%20OR%20security%20OR%20border)&hl=en&gl=LA&ceid=LA:en',
    region: 'Asia',
  },
  {
    name: 'Malaysia Top',
    url: 'https://news.google.com/rss?hl=en&gl=MY&ceid=MY:en',
    region: 'Asia',
  },
  {
    name: 'Malaysia Crisis',
    url: 'https://news.google.com/rss/search?q=Malaysia%20(protest%20OR%20unrest%20OR%20security%20OR%20attack)&hl=en&gl=MY&ceid=MY:en',
    region: 'Asia',
  },
  {
    name: 'Mongolia Top',
    url: 'https://news.google.com/rss?hl=en&gl=MN&ceid=MN:en',
    region: 'Asia',
  },
  {
    name: 'Mongolia Crisis',
    url: 'https://news.google.com/rss/search?q=Mongolia%20(protest%20OR%20unrest%20OR%20security%20OR%20crisis)&hl=en&gl=MN&ceid=MN:en',
    region: 'Asia',
  },
  {
    name: 'Myanmar Top',
    url: 'https://news.google.com/rss?hl=en&gl=MM&ceid=MM:en',
    region: 'Asia',
  },
  {
    name: 'Myanmar Crisis',
    url: 'https://news.google.com/rss/search?q=Myanmar%20(coup%20OR%20airstrike%20OR%20conflict%20OR%20junta%20OR%20rebels%20OR%20displacement%20OR%20humanitarian)&hl=en&gl=MM&ceid=MM:en',
    region: 'Asia',
  },
  { name: 'Nepal Top', url: 'https://news.google.com/rss?hl=en&gl=NP&ceid=NP:en', region: 'Asia' },
  {
    name: 'Nepal Crisis',
    url: 'https://news.google.com/rss/search?q=Nepal%20(protest%20OR%20unrest%20OR%20security%20OR%20crisis)&hl=en&gl=NP&ceid=NP:en',
    region: 'Asia',
  },
  {
    name: 'North Korea Top',
    url: 'https://news.google.com/rss?hl=en&gl=KP&ceid=KP:en',
    region: 'Asia',
  },
  {
    name: 'North Korea Crisis',
    url: 'https://news.google.com/rss/search?q=%22North%20Korea%22%20(missile%20OR%20launch%20OR%20nuclear%20OR%20test%20OR%20sanctions%20OR%20border)&hl=en&gl=KP&ceid=KP:en',
    region: 'Asia',
  },
  {
    name: 'Pakistan Top',
    url: 'https://news.google.com/rss?hl=en&gl=PK&ceid=PK:en',
    region: 'Asia',
  },
  {
    name: 'Pakistan Crisis',
    url: 'https://news.google.com/rss/search?q=Pakistan%20(attack%20OR%20blast%20OR%20Balochistan%20OR%20border%20OR%20militant%20OR%20terror%20OR%20protest%20OR%20unrest)&hl=en&gl=PK&ceid=PK:en',
    region: 'Asia',
  },
  {
    name: 'Philippines Top',
    url: 'https://news.google.com/rss?hl=en&gl=PH&ceid=PH:en',
    region: 'Asia',
  },
  {
    name: 'Philippines Crisis',
    url: 'https://news.google.com/rss/search?q=Philippines%20(%22South%20China%20Sea%22%20OR%20China%20OR%20collision%20OR%20attack%20OR%20protest%20OR%20unrest%20OR%20security)&hl=en&gl=PH&ceid=PH:en',
    region: 'Asia',
  },
  {
    name: 'Singapore Top',
    url: 'https://news.google.com/rss?hl=en&gl=SG&ceid=SG:en',
    region: 'Asia',
  },
  {
    name: 'Singapore Crisis',
    url: 'https://news.google.com/rss/search?q=Singapore%20(security%20OR%20diplomacy%20OR%20sanctions%20OR%20cyber%20attack)&hl=en&gl=SG&ceid=SG:en',
    region: 'Asia',
  },
  {
    name: 'South Korea Top',
    url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',
    region: 'Asia',
  },
  {
    name: 'South Korea Crisis',
    url: 'https://news.google.com/rss/search?q=%22South%20Korea%22%20(North%20Korea%20OR%20missile%20OR%20launch%20OR%20security%20OR%20attack)&hl=en&gl=KR&ceid=KR:en',
    region: 'Asia',
  },
  {
    name: 'Sri Lanka Top',
    url: 'https://news.google.com/rss?hl=en&gl=LK&ceid=LK:en',
    region: 'Asia',
  },
  {
    name: 'Sri Lanka Crisis',
    url: 'https://news.google.com/rss/search?q=Sri%20Lanka%20(protest%20OR%20unrest%20OR%20security%20OR%20crisis)&hl=en&gl=LK&ceid=LK:en',
    region: 'Asia',
  },
  { name: 'Taiwan Top', url: 'https://news.google.com/rss?hl=en&gl=TW&ceid=TW:en', region: 'Asia' },
  {
    name: 'Taiwan Crisis',
    url: 'https://news.google.com/rss/search?q=Taiwan%20(China%20OR%20incursion%20OR%20military%20exercise%20OR%20strait%20OR%20security)&hl=en&gl=TW&ceid=TW:en',
    region: 'Asia',
  },
  {
    name: 'Tajikistan Top',
    url: 'https://news.google.com/rss?hl=en&gl=TJ&ceid=TJ:en',
    region: 'Asia',
  },
  {
    name: 'Tajikistan Crisis',
    url: 'https://news.google.com/rss/search?q=Tajikistan%20(border%20OR%20clashes%20OR%20security%20OR%20unrest%20OR%20attack)&hl=en&gl=TJ&ceid=TJ:en',
    region: 'Asia',
  },
  {
    name: 'Thailand Top',
    url: 'https://news.google.com/rss?hl=th&gl=TH&ceid=TH:th',
    region: 'Asia',
  },
  {
    name: 'Thailand Crisis',
    url: 'https://news.google.com/rss/search?q=Thailand%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20border)&hl=en&gl=TH&ceid=TH:en',
    region: 'Asia',
  },
  {
    name: 'Turkmenistan Top',
    url: 'https://news.google.com/rss?hl=en&gl=TM&ceid=TM:en',
    region: 'Asia',
  },
  {
    name: 'Turkmenistan Crisis',
    url: 'https://news.google.com/rss/search?q=Turkmenistan%20(border%20OR%20security%20OR%20unrest%20OR%20crisis)&hl=en&gl=TM&ceid=TM:en',
    region: 'Asia',
  },
  {
    name: 'Uzbekistan Top',
    url: 'https://news.google.com/rss?hl=en&gl=UZ&ceid=UZ:en',
    region: 'Asia',
  },
  {
    name: 'Uzbekistan Crisis',
    url: 'https://news.google.com/rss/search?q=Uzbekistan%20(protest%20OR%20unrest%20OR%20border%20OR%20security%20OR%20attack)&hl=en&gl=UZ&ceid=UZ:en',
    region: 'Asia',
  },
  {
    name: 'Vietnam Top',
    url: 'https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi',
    region: 'Asia',
  },
  {
    name: 'Vietnam Crisis',
    url: 'https://news.google.com/rss/search?q=Vietnam%20(%22South%20China%20Sea%22%20OR%20China%20OR%20security%20OR%20protest%20OR%20unrest)&hl=en&gl=VN&ceid=VN:en',
    region: 'Asia',
  },

  // ── REGIONAL INTELLIGENCE: AFRICA ──
  {
    name: 'Algeria Top',
    url: 'https://news.google.com/rss?hl=fr&gl=DZ&ceid=DZ:fr',
    region: 'Africa',
  },
  {
    name: 'Algeria Crisis',
    url: 'https://news.google.com/rss/search?q=Algeria%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20terror)&hl=fr&gl=DZ&ceid=DZ:fr',
    region: 'Africa',
  },
  {
    name: 'Angola Top',
    url: 'https://news.google.com/rss?hl=pt-PT&gl=AO&ceid=AO:pt-PT',
    region: 'Africa',
  },
  {
    name: 'Angola Crisis',
    url: 'https://news.google.com/rss/search?q=Angola%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20election)&hl=pt-PT&gl=AO&ceid=AO:pt-PT',
    region: 'Africa',
  },
  {
    name: 'Benin Top',
    url: 'https://news.google.com/rss?hl=fr&gl=BJ&ceid=BJ:fr',
    region: 'Africa',
  },
  {
    name: 'Benin Crisis',
    url: 'https://news.google.com/rss/search?q=Benin%20(attack%20OR%20terror%20OR%20border%20OR%20security%20OR%20unrest)&hl=fr&gl=BJ&ceid=BJ:fr',
    region: 'Africa',
  },
  {
    name: 'Burkina Faso Top',
    url: 'https://news.google.com/rss?hl=fr&gl=BF&ceid=BF:fr',
    region: 'Africa',
  },
  {
    name: 'Burkina Faso Crisis',
    url: 'https://news.google.com/rss/search?q=Burkina%20Faso%20(jihadist%20OR%20attack%20OR%20terror%20OR%20coup%20OR%20security%20OR%20Sahel)&hl=fr&gl=BF&ceid=BF:fr',
    region: 'Africa',
  },
  {
    name: 'Burundi Top',
    url: 'https://news.google.com/rss?hl=fr&gl=BI&ceid=BI:fr',
    region: 'Africa',
  },
  {
    name: 'Burundi Crisis',
    url: 'https://news.google.com/rss/search?q=Burundi%20(unrest%20OR%20attack%20OR%20security%20OR%20protest%20OR%20border)&hl=fr&gl=BI&ceid=BI:fr',
    region: 'Africa',
  },
  {
    name: 'Cameroon Top',
    url: 'https://news.google.com/rss?hl=fr&gl=CM&ceid=CM:fr',
    region: 'Africa',
  },
  {
    name: 'Cameroon Crisis',
    url: 'https://news.google.com/rss/search?q=Cameroon%20(Anglophone%20OR%20attack%20OR%20separatist%20OR%20security%20OR%20unrest)&hl=fr&gl=CM&ceid=CM:fr',
    region: 'Africa',
  },
  { name: 'CAR Top', url: 'https://news.google.com/rss?hl=fr&gl=CF&ceid=CF:fr', region: 'Africa' },
  {
    name: 'CAR Crisis',
    url: 'https://news.google.com/rss/search?q=%22Central%20African%20Republic%22%20(attack%20OR%20violence%20OR%20rebels%20OR%20security%20OR%20UN)&hl=fr&gl=CF&ceid=CF:fr',
    region: 'Africa',
  },
  { name: 'Chad Top', url: 'https://news.google.com/rss?hl=fr&gl=TD&ceid=TD:fr', region: 'Africa' },
  {
    name: 'Chad Crisis',
    url: 'https://news.google.com/rss/search?q=Chad%20(Sahel%20OR%20attack%20OR%20terror%20OR%20border%20OR%20security%20OR%20unrest)&hl=fr&gl=TD&ceid=TD:fr',
    region: 'Africa',
  },
  {
    name: "Cote d'Ivoire Top",
    url: 'https://news.google.com/rss?hl=fr&gl=CI&ceid=CI:fr',
    region: 'Africa',
  },
  {
    name: "Cote d'Ivoire Crisis",
    url: 'https://news.google.com/rss/search?q=Cote%20d%27Ivoire%20(protest%20OR%20unrest%20OR%20election%20OR%20security)&hl=fr&gl=CI&ceid=CI:fr',
    region: 'Africa',
  },
  { name: 'DRC Top', url: 'https://news.google.com/rss?hl=fr&gl=CD&ceid=CD:fr', region: 'Africa' },
  {
    name: 'DRC Crisis',
    url: 'https://news.google.com/rss/search?q=DRC%20OR%20%22Democratic%20Republic%20of%20the%20Congo%22%20(M23%20OR%20Goma%20OR%20attack%20OR%20violence%20OR%20displacement)&hl=fr&gl=CD&ceid=CD:fr',
    region: 'Africa',
  },
  {
    name: 'Djibouti Top',
    url: 'https://news.google.com/rss?hl=fr&gl=DJ&ceid=DJ:fr',
    region: 'Africa',
  },
  {
    name: 'Djibouti Crisis',
    url: 'https://news.google.com/rss/search?q=Djibouti%20(Red%20Sea%20OR%20port%20OR%20security%20OR%20unrest%20OR%20attack)&hl=fr&gl=DJ&ceid=DJ:fr',
    region: 'Africa',
  },
  {
    name: 'Ethiopia Top',
    url: 'https://news.google.com/rss?hl=en&gl=ET&ceid=ET:en',
    region: 'Africa',
  },
  {
    name: 'Ethiopia Crisis',
    url: 'https://news.google.com/rss/search?q=Ethiopia%20(Tigray%20OR%20Amhara%20OR%20attack%20OR%20clashes%20OR%20security%20OR%20displacement)&hl=en&gl=ET&ceid=ET:en',
    region: 'Africa',
  },
  {
    name: 'Gabon Top',
    url: 'https://news.google.com/rss?hl=fr&gl=GA&ceid=GA:fr',
    region: 'Africa',
  },
  {
    name: 'Gabon Crisis',
    url: 'https://news.google.com/rss/search?q=Gabon%20(coup%20OR%20protest%20OR%20unrest%20OR%20security%20OR%20election)&hl=fr&gl=GA&ceid=GA:fr',
    region: 'Africa',
  },
  {
    name: 'Ghana Top',
    url: 'https://news.google.com/rss?hl=en&gl=GH&ceid=GH:en',
    region: 'Africa',
  },
  {
    name: 'Ghana Crisis',
    url: 'https://news.google.com/rss/search?q=Ghana%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20election)&hl=en&gl=GH&ceid=GH:en',
    region: 'Africa',
  },
  {
    name: 'Guinea Top',
    url: 'https://news.google.com/rss?hl=fr&gl=GN&ceid=GN:fr',
    region: 'Africa',
  },
  {
    name: 'Guinea Crisis',
    url: 'https://news.google.com/rss/search?q=Guinea%20(coup%20OR%20protest%20OR%20unrest%20OR%20security%20OR%20election)&hl=fr&gl=GN&ceid=GN:fr',
    region: 'Africa',
  },
  {
    name: 'Kenya Top',
    url: 'https://news.google.com/rss?hl=en&gl=KE&ceid=KE:en',
    region: 'Africa',
  },
  {
    name: 'Kenya Crisis',
    url: 'https://news.google.com/rss/search?q=Kenya%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20election)&hl=en&gl=KE&ceid=KE:en',
    region: 'Africa',
  },
  {
    name: 'Libya Top',
    url: 'https://news.google.com/rss?hl=ar&gl=LY&ceid=LY:ar',
    region: 'Africa',
  },
  {
    name: 'Libya Crisis',
    url: 'https://news.google.com/rss/search?q=Libya%20(clashes%20OR%20militia%20OR%20attack%20OR%20oil%20OR%20security%20OR%20unrest)&hl=ar&gl=LY&ceid=LY:ar',
    region: 'Africa',
  },
  { name: 'Mali Top', url: 'https://news.google.com/rss?hl=fr&gl=ML&ceid=ML:fr', region: 'Africa' },
  {
    name: 'Mali Crisis',
    url: 'https://news.google.com/rss/search?q=Mali%20(Sahel%20OR%20jihadist%20OR%20attack%20OR%20terror%20OR%20coup%20OR%20security)&hl=fr&gl=ML&ceid=ML:fr',
    region: 'Africa',
  },
  {
    name: 'Mauritania Top',
    url: 'https://news.google.com/rss?hl=fr&gl=MR&ceid=MR:fr',
    region: 'Africa',
  },
  {
    name: 'Mauritania Crisis',
    url: 'https://news.google.com/rss/search?q=Mauritania%20(Sahel%20OR%20border%20OR%20security%20OR%20attack%20OR%20unrest)&hl=fr&gl=MR&ceid=MR:fr',
    region: 'Africa',
  },
  {
    name: 'Morocco Top',
    url: 'https://news.google.com/rss?hl=fr&gl=MA&ceid=MA:fr',
    region: 'Africa',
  },
  {
    name: 'Morocco Crisis',
    url: 'https://news.google.com/rss/search?q=Morocco%20(protest%20OR%20unrest%20OR%20security%20OR%20attack%20OR%20Western%20Sahara)&hl=fr&gl=MA&ceid=MA:fr',
    region: 'Africa',
  },
  {
    name: 'Mozambique Top',
    url: 'https://news.google.com/rss?hl=pt-PT&gl=MZ&ceid=MZ:pt-PT',
    region: 'Africa',
  },
  {
    name: 'Mozambique Crisis',
    url: 'https://news.google.com/rss/search?q=Mozambique%20(Cabo%20Delgado%20OR%20insurgency%20OR%20attack%20OR%20security%20OR%20unrest)&hl=pt-PT&gl=MZ&ceid=MZ:pt-PT',
    region: 'Africa',
  },
  {
    name: 'Niger Top',
    url: 'https://news.google.com/rss?hl=fr&gl=NE&ceid=NE:fr',
    region: 'Africa',
  },
  {
    name: 'Niger Crisis',
    url: 'https://news.google.com/rss/search?q=Niger%20(Sahel%20OR%20coup%20OR%20attack%20OR%20terror%20OR%20border%20OR%20security)&hl=fr&gl=NE&ceid=NE:fr',
    region: 'Africa',
  },
  {
    name: 'Nigeria Top',
    url: 'https://news.google.com/rss?hl=en&gl=NG&ceid=NG:en',
    region: 'Africa',
  },
  {
    name: 'Nigeria Crisis',
    url: 'https://news.google.com/rss/search?q=Nigeria%20(Boko%20Haram%20OR%20bandits%20OR%20kidnapping%20OR%20attack%20OR%20protest%20OR%20unrest)&hl=en&gl=NG&ceid=NG:en',
    region: 'Africa',
  },
  {
    name: 'Rwanda Top',
    url: 'https://news.google.com/rss?hl=en&gl=RW&ceid=RW:en',
    region: 'Africa',
  },
  {
    name: 'Rwanda Crisis',
    url: 'https://news.google.com/rss/search?q=Rwanda%20(DRC%20OR%20border%20OR%20security%20OR%20unrest%20OR%20attack)&hl=en&gl=RW&ceid=RW:en',
    region: 'Africa',
  },
  {
    name: 'Senegal Top',
    url: 'https://news.google.com/rss?hl=fr&gl=SN&ceid=SN:fr',
    region: 'Africa',
  },
  {
    name: 'Senegal Crisis',
    url: 'https://news.google.com/rss/search?q=Senegal%20(protest%20OR%20unrest%20OR%20election%20OR%20security)&hl=fr&gl=SN&ceid=SN:fr',
    region: 'Africa',
  },
  {
    name: 'Somalia Top',
    url: 'https://news.google.com/rss?hl=en&gl=SO&ceid=SO:en',
    region: 'Africa',
  },
  {
    name: 'Somalia Crisis',
    url: 'https://news.google.com/rss/search?q=Somalia%20(al%20Shabaab%20OR%20attack%20OR%20bombing%20OR%20security%20OR%20unrest)&hl=en&gl=SO&ceid=SO:en',
    region: 'Africa',
  },
  {
    name: 'South Africa Top',
    url: 'https://news.google.com/rss?hl=en&gl=ZA&ceid=ZA:en',
    region: 'Africa',
  },
  {
    name: 'South Africa Crisis',
    url: 'https://news.google.com/rss/search?q=South%20Africa%20(riot%20OR%20protest%20OR%20unrest%20OR%20attack%20OR%20security)&hl=en&gl=ZA&ceid=ZA:en',
    region: 'Africa',
  },
  {
    name: 'South Sudan Top',
    url: 'https://news.google.com/rss?hl=en&gl=SS&ceid=SS:en',
    region: 'Africa',
  },
  {
    name: 'South Sudan Crisis',
    url: 'https://news.google.com/rss/search?q=%22South%20Sudan%22%20(violence%20OR%20clashes%20OR%20attack%20OR%20displacement%20OR%20security)&hl=en&gl=SS&ceid=SS:en',
    region: 'Africa',
  },
  {
    name: 'Sudan Top',
    url: 'https://news.google.com/rss?hl=en&gl=SD&ceid=SD:en',
    region: 'Africa',
  },
  {
    name: 'Sudan Crisis',
    url: 'https://news.google.com/rss/search?q=Sudan%20(Khartoum%20OR%20RSF%20OR%20SAF%20OR%20airstrike%20OR%20massacre%20OR%20humanitarian%20OR%20aid)&hl=en&gl=SD&ceid=SD:en',
    region: 'Africa',
  },
  {
    name: 'Tanzania Top',
    url: 'https://news.google.com/rss?hl=en&gl=TZ&ceid=TZ:en',
    region: 'Africa',
  },
  {
    name: 'Tanzania Crisis',
    url: 'https://news.google.com/rss/search?q=Tanzania%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20election)&hl=en&gl=TZ&ceid=TZ:en',
    region: 'Africa',
  },
  {
    name: 'Tunisia Top',
    url: 'https://news.google.com/rss?hl=fr&gl=TN&ceid=TN:fr',
    region: 'Africa',
  },
  {
    name: 'Tunisia Crisis',
    url: 'https://news.google.com/rss/search?q=Tunisia%20(protest%20OR%20unrest%20OR%20arrest%20OR%20security%20OR%20election)&hl=fr&gl=TN&ceid=TN:fr',
    region: 'Africa',
  },
  {
    name: 'Uganda Top',
    url: 'https://news.google.com/rss?hl=en&gl=UG&ceid=UG:en',
    region: 'Africa',
  },
  {
    name: 'Uganda Crisis',
    url: 'https://news.google.com/rss/search?q=Uganda%20(protest%20OR%20unrest%20OR%20attack%20OR%20security%20OR%20election)&hl=en&gl=UG&ceid=UG:en',
    region: 'Africa',
  },
  {
    name: 'Zambia Top',
    url: 'https://news.google.com/rss?hl=en&gl=ZM&ceid=ZM:en',
    region: 'Africa',
  },
  {
    name: 'Zambia Crisis',
    url: 'https://news.google.com/rss/search?q=Zambia%20(protest%20OR%20unrest%20OR%20security%20OR%20election)&hl=en&gl=ZM&ceid=ZM:en',
    region: 'Africa',
  },
  {
    name: 'Zimbabwe Top',
    url: 'https://news.google.com/rss?hl=en&gl=ZW&ceid=ZW:en',
    region: 'Africa',
  },
  {
    name: 'Zimbabwe Crisis',
    url: 'https://news.google.com/rss/search?q=Zimbabwe%20(protest%20OR%20unrest%20OR%20security%20OR%20election%20OR%20sanctions)&hl=en&gl=ZW&ceid=ZW:en',
    region: 'Africa',
  },

  // ── REGIONAL INTELLIGENCE: NORTH AMERICA ──
  {
    name: 'USA Top',
    url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
    region: 'North America',
  },
  {
    name: 'USA Crisis',
    url: 'https://news.google.com/rss/search?q=United%20States%20(attack%20OR%20shooting%20OR%20protest%20OR%20unrest%20OR%20riot%20OR%20terror%20OR%20border%20OR%20sanctions%20OR%20cyber%20attack)&hl=en-US&gl=US&ceid=US:en',
    region: 'North America',
  },
  {
    name: 'Canada Top',
    url: 'https://news.google.com/rss?hl=en-CA&gl=CA&ceid=CA:en',
    region: 'North America',
  },
  {
    name: 'Canada Crisis',
    url: 'https://news.google.com/rss/search?q=Canada%20(attack%20OR%20shooting%20OR%20protest%20OR%20unrest%20OR%20security%20OR%20border%20OR%20wildfire%20OR%20evacuation)&hl=en-CA&gl=CA&ceid=CA:en',
    region: 'North America',
  },
  {
    name: 'Mexico Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=MX&ceid=MX:es-419',
    region: 'North America',
  },
  {
    name: 'Mexico Crisis',
    url: 'https://news.google.com/rss/search?q=M%C3%A9xico%20(ataque%20OR%20asesinato%20OR%20c%C3%A1rtel%20OR%20violencia%20OR%20secuestro%20OR%20protesta%20OR%20disturbios%20OR%20frontera)&hl=es-419&gl=MX&ceid=MX:es-419',
    region: 'North America',
  },
  {
    name: 'Greenland Top',
    url: 'https://news.google.com/rss?hl=en&gl=GL&ceid=GL:en',
    region: 'North America',
  },
  {
    name: 'Greenland Crisis',
    url: 'https://news.google.com/rss/search?q=Greenland%20(security%20OR%20diplomacy%20OR%20military%20OR%20Arctic%20OR%20crisis)&hl=en&gl=GL&ceid=GL:en',
    region: 'North America',
  },

  // ── REGIONAL INTELLIGENCE: CENTRAL AMERICA ──
  {
    name: 'Belize Top',
    url: 'https://news.google.com/rss?hl=en&gl=BZ&ceid=BZ:en',
    region: 'North America',
  },
  {
    name: 'Belize Crisis',
    url: 'https://news.google.com/rss/search?q=Belize%20(attack%20OR%20violence%20OR%20gang%20OR%20protest%20OR%20unrest%20OR%20security)&hl=en&gl=BZ&ceid=BZ:en',
    region: 'North America',
  },
  {
    name: 'Guatemala Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=GT&ceid=GT:es-419',
    region: 'North America',
  },
  {
    name: 'Guatemala Crisis',
    url: 'https://news.google.com/rss/search?q=Guatemala%20(violencia%20OR%20ataque%20OR%20pandillas%20OR%20protesta%20OR%20disturbios%20OR%20corrupci%C3%B3n%20OR%20crisis)&hl=es-419&gl=GT&ceid=GT:es-419',
    region: 'North America',
  },
  {
    name: 'El Salvador Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=SV&ceid=SV:es-419',
    region: 'North America',
  },
  {
    name: 'El Salvador Crisis',
    url: 'https://news.google.com/rss/search?q=El%20Salvador%20(pandillas%20OR%20violencia%20OR%20ataque%20OR%20protesta%20OR%20disturbios%20OR%20estado%20de%20excepci%C3%B3n)&hl=es-419&gl=SV&ceid=SV:es-419',
    region: 'North America',
  },
  {
    name: 'Honduras Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=HN&ceid=HN:es-419',
    region: 'North America',
  },
  {
    name: 'Honduras Crisis',
    url: 'https://news.google.com/rss/search?q=Honduras%20(violencia%20OR%20ataque%20OR%20pandillas%20OR%20protesta%20OR%20disturbios%20OR%20crisis)&hl=es-419&gl=HN&ceid=HN:es-419',
    region: 'North America',
  },
  {
    name: 'Nicaragua Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=NI&ceid=NI:es-419',
    region: 'North America',
  },
  {
    name: 'Nicaragua Crisis',
    url: 'https://news.google.com/rss/search?q=Nicaragua%20(protesta%20OR%20represi%C3%B3n%20OR%20disturbios%20OR%20crisis%20OR%20violencia%20OR%20ataque)&hl=es-419&gl=NI&ceid=NI:es-419',
    region: 'North America',
  },
  {
    name: 'Costa Rica Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=CR&ceid=CR:es-419',
    region: 'North America',
  },
  {
    name: 'Costa Rica Crisis',
    url: 'https://news.google.com/rss/search?q=Costa%20Rica%20(violencia%20OR%20ataque%20OR%20narcotr%C3%A1fico%20OR%20protesta%20OR%20disturbios%20OR%20seguridad)&hl=es-419&gl=CR&ceid=CR:es-419',
    region: 'North America',
  },
  {
    name: 'Panama Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=PA&ceid=PA:es-419',
    region: 'North America',
  },
  {
    name: 'Panama Crisis',
    url: 'https://news.google.com/rss/search?q=Panam%C3%A1%20(protesta%20OR%20disturbios%20OR%20crisis%20OR%20ataque%20OR%20seguridad%20OR%20migrantes%20OR%20Dari%C3%A9n)&hl=es-419&gl=PA&ceid=PA:es-419',
    region: 'North America',
  },

  // ── REGIONAL INTELLIGENCE: CARIBBEAN ──
  {
    name: 'Haiti Top',
    url: 'https://news.google.com/rss?hl=fr&gl=HT&ceid=HT:fr',
    region: 'North America',
  },
  {
    name: 'Haiti Crisis',
    url: 'https://news.google.com/rss/search?q=Ha%C3%AFti%20(gang%20OR%20violence%20OR%20kidnapping%20OR%20attack%20OR%20unrest%20OR%20crisis%20OR%20Port-au-Prince)&hl=fr&gl=HT&ceid=HT:fr',
    region: 'North America',
  },
  {
    name: 'Cuba Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=CU&ceid=CU:es-419',
    region: 'North America',
  },
  {
    name: 'Cuba Crisis',
    url: 'https://news.google.com/rss/search?q=Cuba%20(protesta%20OR%20disturbios%20OR%20crisis%20OR%20apag%C3%B3n%20OR%20escasez%20OR%20represi%C3%B3n)&hl=es-419&gl=CU&ceid=CU:es-419',
    region: 'North America',
  },
  {
    name: 'Dominican Republic Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=DO&ceid=DO:es-419',
    region: 'North America',
  },
  {
    name: 'Dominican Republic Crisis',
    url: 'https://news.google.com/rss/search?q=Rep%C3%BAblica%20Dominicana%20(Hait%C3%AD%20OR%20frontera%20OR%20protesta%20OR%20disturbios%20OR%20violencia%20OR%20ataque)&hl=es-419&gl=DO&ceid=DO:es-419',
    region: 'North America',
  },
  {
    name: 'Jamaica Top',
    url: 'https://news.google.com/rss?hl=en&gl=JM&ceid=JM:en',
    region: 'North America',
  },
  {
    name: 'Jamaica Crisis',
    url: 'https://news.google.com/rss/search?q=Jamaica%20(violence%20OR%20gang%20OR%20shooting%20OR%20attack%20OR%20protest%20OR%20unrest%20OR%20security)&hl=en&gl=JM&ceid=JM:en',
    region: 'North America',
  },
  {
    name: 'Bahamas Top',
    url: 'https://news.google.com/rss?hl=en&gl=BS&ceid=BS:en',
    region: 'North America',
  },
  {
    name: 'Bahamas Crisis',
    url: 'https://news.google.com/rss/search?q=Bahamas%20(shooting%20OR%20attack%20OR%20crime%20OR%20protest%20OR%20unrest%20OR%20hurricane)&hl=en&gl=BS&ceid=BS:en',
    region: 'North America',
  },
  {
    name: 'Trinidad and Tobago Top',
    url: 'https://news.google.com/rss?hl=en&gl=TT&ceid=TT:en',
    region: 'North America',
  },
  {
    name: 'Trinidad and Tobago Crisis',
    url: 'https://news.google.com/rss/search?q=%22Trinidad%20and%20Tobago%22%20(violence%20OR%20shooting%20OR%20attack%20OR%20protest%20OR%20unrest%20OR%20security)&hl=en&gl=TT&ceid=TT:en',
    region: 'North America',
  },

  // ── REGIONAL INTELLIGENCE: SOUTH AMERICA ──
  {
    name: 'Argentina Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419',
    region: 'South America',
  },
  {
    name: 'Argentina Crisis',
    url: 'https://news.google.com/rss/search?q=Argentina%20(protesta%20OR%20disturbios%20OR%20huelga%20OR%20violencia%20OR%20ataque%20OR%20crisis%20OR%20seguridad)&hl=es-419&gl=AR&ceid=AR:es-419',
    region: 'South America',
  },
  {
    name: 'Bolivia Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=BO&ceid=BO:es-419',
    region: 'South America',
  },
  {
    name: 'Bolivia Crisis',
    url: 'https://news.google.com/rss/search?q=Bolivia%20(protesta%20OR%20disturbios%20OR%20bloqueos%20OR%20violencia%20OR%20ataque%20OR%20crisis%20OR%20seguridad)&hl=es-419&gl=BO&ceid=BO:es-419',
    region: 'South America',
  },
  {
    name: 'Brazil Top',
    url: 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419',
    region: 'South America',
  },
  {
    name: 'Brazil Crisis',
    url: 'https://news.google.com/rss/search?q=Brasil%20(protesto%20OR%20dist%C3%BArbios%20OR%20viol%C3%AAncia%20OR%20ataque%20OR%20crime%20OR%20seguran%C3%A7a%20OR%20crise)&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    region: 'South America',
  },
  {
    name: 'Chile Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=CL&ceid=CL:es-419',
    region: 'South America',
  },
  {
    name: 'Chile Crisis',
    url: 'https://news.google.com/rss/search?q=Chile%20(protesta%20OR%20disturbios%20OR%20violencia%20OR%20ataque%20OR%20seguridad%20OR%20crisis%20OR%20Mapuche)&hl=es-419&gl=CL&ceid=CL:es-419',
    region: 'South America',
  },
  {
    name: 'Colombia Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=CO&ceid=CO:es-419',
    region: 'South America',
  },
  {
    name: 'Colombia Crisis',
    url: 'https://news.google.com/rss/search?q=Colombia%20(ataque%20OR%20bomba%20OR%20guerrilla%20OR%20ELN%20OR%20disidencias%20OR%20violencia%20OR%20protesta%20OR%20disturbios)&hl=es-419&gl=CO&ceid=CO:es-419',
    region: 'South America',
  },
  {
    name: 'Ecuador Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=EC&ceid=EC:es-419',
    region: 'South America',
  },
  {
    name: 'Ecuador Crisis',
    url: 'https://news.google.com/rss/search?q=Ecuador%20(ataque%20OR%20violencia%20OR%20narcotr%C3%A1fico%20OR%20pandillas%20OR%20secuestro%20OR%20protesta%20OR%20disturbios%20OR%20crisis)&hl=es-419&gl=EC&ceid=EC:es-419',
    region: 'South America',
  },
  {
    name: 'Guyana Top',
    url: 'https://news.google.com/rss?hl=en&gl=GY&ceid=GY:en',
    region: 'South America',
  },
  {
    name: 'Guyana Crisis',
    url: 'https://news.google.com/rss/search?q=Guyana%20(Venezuela%20OR%20border%20OR%20Essequibo%20OR%20security%20OR%20attack%20OR%20tensions)&hl=en&gl=GY&ceid=GY:en',
    region: 'South America',
  },
  {
    name: 'Paraguay Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=PY&ceid=PY:es-419',
    region: 'South America',
  },
  {
    name: 'Paraguay Crisis',
    url: 'https://news.google.com/rss/search?q=Paraguay%20(protesta%20OR%20disturbios%20OR%20violencia%20OR%20ataque%20OR%20seguridad%20OR%20crisis)&hl=es-419&gl=PY&ceid=PY:es-419',
    region: 'South America',
  },
  {
    name: 'Peru Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=PE&ceid=PE:es-419',
    region: 'South America',
  },
  {
    name: 'Peru Crisis',
    url: 'https://news.google.com/rss/search?q=Per%C3%BA%20(protesta%20OR%20disturbios%20OR%20violencia%20OR%20ataque%20OR%20crisis%20OR%20seguridad)&hl=es-419&gl=PE&ceid=PE:es-419',
    region: 'South America',
  },
  {
    name: 'Suriname Top',
    url: 'https://news.google.com/rss?hl=nl&gl=SR&ceid=SR:nl',
    region: 'South America',
  },
  {
    name: 'Suriname Crisis',
    url: 'https://news.google.com/rss/search?q=Suriname%20(protest%20OR%20unrest%20OR%20security%20OR%20attack%20OR%20crisis)&hl=en&gl=SR&ceid=SR:en',
    region: 'South America',
  },
  {
    name: 'Uruguay Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=UY&ceid=UY:es-419',
    region: 'South America',
  },
  {
    name: 'Uruguay Crisis',
    url: 'https://news.google.com/rss/search?q=Uruguay%20(protesta%20OR%20disturbios%20OR%20violencia%20OR%20ataque%20OR%20seguridad%20OR%20crisis)&hl=es-419&gl=UY&ceid=UY:es-419',
    region: 'South America',
  },
  {
    name: 'Venezuela Top',
    url: 'https://news.google.com/rss?hl=es-419&gl=VE&ceid=VE:es-419',
    region: 'South America',
  },
  {
    name: 'Venezuela Crisis',
    url: 'https://news.google.com/rss/search?q=Venezuela%20(protesta%20OR%20disturbios%20OR%20violencia%20OR%20ataque%20OR%20crisis%20OR%20sanctions%20OR%20election)&hl=es-419&gl=VE&ceid=VE:es-419',
    region: 'South America',
  },

  // Base Sources
  { name: 'BBC News World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', region: 'Global' },
  {
    name: 'BBC News Middle East',
    url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
    region: 'Middle East',
  },
  {
    name: 'BBC News Europe',
    url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
    region: 'Europe / UKR',
  },
  {
    name: 'BBC News Asia',
    url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
    region: 'Asia / HK / TW',
  },
  {
    name: 'BBC News Africa',
    url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
    region: 'Africa',
  },
  {
    name: 'BBC News USA',
    url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
    region: 'North America',
  },
  { name: 'DW World Top', url: 'https://rss.dw.com/rdf/rss-en-top', region: 'Global' },
  { name: 'DW World All', url: 'https://rss.dw.com/rdf/rss-en-all', region: 'Global' },
  { name: 'DW World News', url: 'https://rss.dw.com/rdf/rss-en-world', region: 'Global' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', region: 'Global' },
  { name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml', region: 'North America' },
  { name: 'AP News World', url: 'https://apnews.com/index.rss', region: 'Global' },
  { name: 'Al Jazeera World', url: 'https://www.aljazeera.com/xml/rss/all.xml', region: 'Global' },
  {
    name: 'Reuters Intel',
    url: 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best',
    region: 'Global',
  },

  // Tactical & OSINT (JSON & RSS)
  {
    name: 'OSINT Updates 1',
    url: 'https://rss.app/feeds/v1.1/tIXPKO0O5QBfhdks.json',
    region: 'Global',
  },
  {
    name: 'OSINT Updates 2',
    url: 'https://rss.app/feeds/v1.1/tBMLplUR1g47cmMO.json',
    region: 'Global',
  },
  {
    name: 'OSINT Updates 3',
    url: 'https://rss.app/feeds/v1.1/tBUfraWchQUqzcYC.json',
    region: 'Global',
  },
  {
    name: 'Defense News',
    url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml',
    region: 'Global',
  },
  { name: 'Army War College (SSI)', url: 'https://ssi.armywarcollege.edu/RSS/', region: 'Global' },
  { name: 'Understanding War', url: 'https://understandingwar.org/subscribe/', region: 'Global' },
  { name: 'Crisis Group', url: 'https://www.crisisgroup.org/rss-0', region: 'Global' },
  { name: 'Chatham House', url: 'https://www.chathamhouse.org/rss-feeds', region: 'Global' },

  // United Nations Intelligence
  {
    name: 'UN Peace & Security',
    url: 'https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml',
    region: 'Global',
  },
  {
    name: 'UN Security Council',
    url: 'https://www.un.org/webcast/rss/security-council.xml',
    region: 'Global',
  },
  {
    name: 'UN General Assembly',
    url: 'https://www.un.org/webcast/rss/general-assembly.xml',
    region: 'Global',
  },
  {
    name: 'UN Sanctions & Consolidated List',
    url: 'https://www.un.org/securitycouncil/feed/1.0/updates_unsc_consolidated_list',
    region: 'Global',
  },
  {
    name: 'UN DPPA Peace',
    url: 'https://dppa.un.org/en/peace-and-security-news',
    region: 'Global',
  },
  {
    name: 'UN Human Rights',
    url: 'https://news.un.org/feed/subscribe/en/news/topic/human-rights/feed/rss.xml',
    region: 'Global',
  },
  {
    name: 'UN Law & Crime',
    url: 'https://news.un.org/feed/subscribe/en/news/topic/law-and-crime-prevention/feed/rss.xml',
    region: 'Global',
  },
  { name: 'UN Geneva', url: 'https://www.ungeneva.org/en/news-media/rss', region: 'Europe / UKR' },

  // ReliefWeb (Humanitarian & Security)
  { name: 'ReliefWeb Global', url: 'https://reliefweb.int/rss', region: 'Global' },
  {
    name: 'ReliefWeb Security',
    url: 'https://reliefweb.int/topics/safety-security',
    region: 'Global',
  },
  {
    name: 'ReliefWeb IFRC',
    url: 'https://reliefweb.int/updates?advanced-search=%28S1242%29&list=International+Federation+of+Red+Cross+and+Red+Crescent+Societies+%28IFRC%29+Updates',
    region: 'Global',
  },

  // Specialized Google News Threat Vectors
  {
    name: 'Global Armed Conflict',
    url: 'https://news.google.com/rss/search?q=war%20OR%20conflict%20OR%20attack%20OR%20airstrike%20OR%20missile%20OR%20bombing%20OR%20explosion&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
  {
    name: 'Global Terror Monitor',
    url: 'https://news.google.com/rss/search?q=(terror%20attack%20OR%20bombing%20OR%20suicide%20attack)&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
  {
    name: 'Global Coup & Insurgency',
    url: 'https://news.google.com/rss/search?q=(military%20coup%20OR%20insurgency%20OR%20clashes)&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
  {
    name: 'Iraq Security',
    url: 'https://news.google.com/rss/search?q=(attack%20OR%20explosion%20OR%20bombing)%20Iraq&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Middle East',
  },
  {
    name: 'Iran Security',
    url: 'https://news.google.com/rss/search?q=(attack%20OR%20explosion%20OR%20bombing)%20Iran&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Middle East',
  },
  {
    name: 'Syria Security',
    url: 'https://news.google.com/rss/search?q=(attack%20OR%20explosion%20OR%20bombing)%20Syria&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Middle East',
  },
  {
    name: 'Yemen Security',
    url: 'https://news.google.com/rss/search?q=(attack%20OR%20explosion%20OR%20bombing)%20Yemen&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Middle East',
  },
  {
    name: 'Israel Security',
    url: 'https://news.google.com/rss/search?q=(attack%20OR%20explosion%20OR%20bombing)%20Israel&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Middle East',
  },
  {
    name: 'Lebanon Security',
    url: 'https://news.google.com/rss/search?q=(attack%20OR%20explosion%20OR%20bombing)%20Lebanon&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Middle East',
  },
  {
    name: 'Gaza Security',
    url: 'https://news.google.com/rss/search?q=(attack%20OR%20explosion%20OR%20bombing)%20Gaza&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Middle East',
  },
  {
    name: 'Ukraine Airstrikes',
    url: 'https://news.google.com/rss/search?q=(airstrike%20OR%20missile%20OR%20drone%20strike)%20Ukraine&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Europe / UKR',
  },
  {
    name: 'Russia Airstrikes',
    url: 'https://news.google.com/rss/search?q=(airstrike%20OR%20missile%20OR%20drone%20strike)%20Russia&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Europe / UKR',
  },

  // ── GLOBAL MATERIEL & DEFENSE INTELLIGENCE ──
  // The War Zone
  { name: 'TWZ All', url: 'https://www.thedrive.com/the-war-zone/feed', region: 'Global' },
  { name: 'TWZ Air', url: 'https://www.twz.com/category/air/feed', region: 'Global' },
  { name: 'TWZ Sea', url: 'https://www.twz.com/category/sea/feed', region: 'Global' },
  { name: 'TWZ Navies', url: 'https://www.twz.com/category/navies/feed', region: 'Global' },
  { name: 'TWZ Carriers', url: 'https://www.twz.com/category/carriers/feed', region: 'Global' },
  { name: 'TWZ Destroyers', url: 'https://www.twz.com/category/destroyers/feed', region: 'Global' },
  { name: 'TWZ Submarines', url: 'https://www.twz.com/category/submarines/feed', region: 'Global' },
  { name: 'TWZ Aircraft', url: 'https://www.twz.com/category/aircraft/feed', region: 'Global' },
  { name: 'TWZ Bombers', url: 'https://www.twz.com/category/bombers/feed', region: 'Global' },
  {
    name: 'TWZ Fighters',
    url: 'https://www.twz.com/category/fighter-aircraft/feed',
    region: 'Global',
  },
  { name: 'TWZ Drones', url: 'https://www.twz.com/category/drones/feed', region: 'Global' },
  {
    name: 'TWZ Air Defense',
    url: 'https://www.twz.com/category/air-defense/feed',
    region: 'Global',
  },
  {
    name: 'TWZ Anti-Ship',
    url: 'https://www.twz.com/category/anti-ship-missiles/feed',
    region: 'Global',
  },
  {
    name: 'TWZ Naval Guns',
    url: 'https://www.twz.com/category/naval-gun-systems/feed',
    region: 'Global',
  },

  // US Naval Institute (USNI) & Naval News
  { name: 'USNI News', url: 'https://news.usni.org/feed', region: 'Global' },
  {
    name: 'USNI Royal Navy',
    url: 'https://blog.usni.org/posts/tag/royal-navy/feed',
    region: 'Global',
  },
  { name: 'Naval News Top', url: 'https://www.navalnews.com/feed/', region: 'Global' },
  {
    name: 'Naval News General',
    url: 'https://www.navalnews.com/category/naval-news/feed',
    region: 'Global',
  },
  {
    name: 'Naval News Events',
    url: 'https://www.navalnews.com/category/event-news/feed',
    region: 'Global',
  },
  {
    name: 'Naval News Tech',
    url: 'https://www.navalnews.com/category/naval-technology/feed',
    region: 'Global',
  },
  {
    name: 'Naval News Subs',
    url: 'https://www.navalnews.com/category/submarines/feed',
    region: 'Global',
  },
  {
    name: 'Naval News Air Def',
    url: 'https://www.navalnews.com/category/air-defence/feed',
    region: 'Global',
  },
  {
    name: 'Naval News Shipbuilding',
    url: 'https://www.navalnews.com/category/shipbuilding/feed',
    region: 'Global',
  },

  // Defense & Military Times
  {
    name: 'Navy Times',
    url: 'https://www.navytimes.com/arc/outboundfeeds/rss/?outputType=xml',
    region: 'North America',
  },
  { name: 'Navy Times Mobile', url: 'https://www.navytimes.com/m/rss/', region: 'North America' },
  {
    name: 'Defense News',
    url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml',
    region: 'Global',
  },
  { name: 'Defense News Mobile', url: 'https://www.defensenews.com/m/rss/', region: 'Global' },
  {
    name: 'Air & Space Forces',
    url: 'https://www.airandspaceforces.com/category/air/feed/feed',
    region: 'North America',
  },

  // DVIDS Military Feeds
  { name: 'DVIDS News', url: 'https://www.dvidshub.net/rss/news', region: 'Global' },
  { name: 'DVIDS CNAF', url: 'https://www.dvidshub.net/rss/unit/CNAF', region: 'Global' },
  { name: 'DVIDS NAWDC', url: 'https://www.dvidshub.net/rss/unit/NAWDC', region: 'Global' },
  { name: 'DVIDS CSG-1', url: 'https://www.dvidshub.net/rss/unit/CSG1', region: 'Global' },
  { name: 'DVIDS CSG-3', url: 'https://www.dvidshub.net/rss/unit/CSG3', region: 'Global' },
  { name: 'DVIDS CVW-3', url: 'https://www.dvidshub.net/rss/unit/CVW3', region: 'Global' },
  { name: 'DVIDS NAVAIR', url: 'https://www.dvidshub.net/rss/unit/NAVAIR', region: 'Global' },

  // Official US Navy PR
  {
    name: 'US Navy News 1',
    url: 'https://www.navy.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1067&max=10',
    region: 'North America',
  },
  {
    name: 'US Navy News 2',
    url: 'https://www.navy.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=2&Site=1067&max=10',
    region: 'North America',
  },
  {
    name: 'US Navy News 3',
    url: 'https://www.navy.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=3&Site=1067&max=10',
    region: 'North America',
  },
  {
    name: 'US Navy News 4',
    url: 'https://www.navy.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=4&Site=1067&max=10',
    region: 'North America',
  },
  {
    name: 'US Navy News 5',
    url: 'https://www.navy.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=5&Site=1067&max=10',
    region: 'North America',
  },

  // Official US Air Force PR
  {
    name: 'USAF Top',
    url: 'https://www.af.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1&max=20',
    region: 'North America',
  },
  {
    name: 'USAF 744',
    url: 'https://www.af.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1&Category=744&max=20',
    region: 'North America',
  },
  {
    name: 'USAF 755',
    url: 'https://www.af.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1&Category=755&max=20',
    region: 'North America',
  },
  {
    name: 'USAF 789',
    url: 'https://www.af.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1&Category=789&max=20',
    region: 'North America',
  },
  {
    name: 'USAF 14852',
    url: 'https://www.af.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1&Category=14852&max=20',
    region: 'North America',
  },

  // GDELT Aviation/Naval Queries
  {
    name: 'GDELT Aviation',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(fighter%20jet%20OR%20F-35%20OR%20F-16%20OR%20Su-35%20OR%20bomber%20OR%20drone)&mode=ArtList&format=json&sort=HybridRel',
    region: 'Global',
  },
  {
    name: 'GDELT Naval',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(warship%20OR%20destroyer%20OR%20frigate%20OR%20aircraft%20carrier%20OR%20submarine)&mode=ArtList&format=json&sort=HybridRel',
    region: 'Global',
  },

  // Google News Hardware Queries
  {
    name: 'Google Aviation',
    url: 'https://news.google.com/rss/search?q=(fighter%20jet%20OR%20F-35%20OR%20F-16%20OR%20Su-35%20OR%20bomber%20OR%20military%20aircraft)&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
  {
    name: 'Google SecNav',
    url: 'https://news.google.com/rss/search?q=(warship%20OR%20destroyer%20OR%20frigate%20OR%20aircraft%20carrier%20OR%20submarine)%20navy&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
  {
    name: 'Google CSG',
    url: 'https://news.google.com/rss/search?q=(aircraft%20carrier%20OR%20carrier%20strike%20group%20OR%20CVN)%20deployment&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
  {
    name: 'Google Subs',
    url: 'https://news.google.com/rss/search?q=(submarine%20OR%20SSN%20OR%20SSBN)%20launch%20OR%20deployment&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
  {
    name: 'Google DDGs',
    url: 'https://news.google.com/rss/search?q=(missile%20destroyer%20OR%20guided%20missile%20destroyer%20OR%20DDG)%20navy&hl=en-GB&gl=GB&ceid=GB:en',
    region: 'Global',
  },
];

// FIX 7: Safe item id generation — never returns undefined
function makeItemId(item: any, feedName: string): string {
  const raw = item.guid || item.link || item.title || '';
  if (raw) return raw;
  // Fallback: hash of title+source to ensure uniqueness
  return crypto
    .createHash('md5')
    .update(`${feedName}:${item.title || Math.random()}`)
    .digest('hex');
}

// Anchor coordinates for each feed — used when keyword scoring fails to identify a specific city
// This dramatically reduces mis-placement (Ukraine article landing in Africa, etc.)
const FEED_DEFAULT_LOCATION: Record<string, { lat: number; lng: number; name: string }> = {
  'Iraq PMO (Official)': { lat: 33.3152, lng: 44.3661, name: 'Baghdad' },
  'Iran MFA (Official)': { lat: 35.6892, lng: 51.389, name: 'Tehran' },
  'Israel PMO (Official)': { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  'Ukraine Pres (Official)': { lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  'Russia Kremlin (Official)': { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  'Turkey MFA (Official)': { lat: 39.9334, lng: 32.8597, name: 'Ankara' },
  'UK 10 Downing (Official)': { lat: 51.5074, lng: -0.1278, name: 'London' },
  'India PMO (Official)': { lat: 28.6139, lng: 77.209, name: 'New Delhi' },
  'Pakistan PMO (Official)': { lat: 33.6844, lng: 73.0479, name: 'Islamabad' },
  'Syria Govt (Official)': { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  'Venezuela Govt (Official)': { lat: 10.4806, lng: -66.9036, name: 'Caracas' },
  'Qatar Govt (Official)': { lat: 25.2854, lng: 51.531, name: 'Doha' },
  'Bahrain Monitor': { lat: 26.2235, lng: 50.5876, name: 'Manama' },
  'Egypt Security Focus': { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  'Jordan Border Intel': { lat: 31.9454, lng: 35.9284, name: 'Amman' },
  'Kuwait Security Monitor': { lat: 29.3759, lng: 47.9774, name: 'Kuwait City' },
  'Oman Mediation Intel': { lat: 23.588, lng: 58.3829, name: 'Muscat' },
  'Saudi Security Monitor': { lat: 24.7136, lng: 46.6753, name: 'Riyadh' },
  'UAE Diplomatic Intel': { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi' },
  'Qatar Mediation Intel': { lat: 25.2854, lng: 51.531, name: 'Doha' },
  'Lebanon Strike Intel': { lat: 33.8886, lng: 35.4955, name: 'Beirut' },
  'Syria Crisis Monitor': { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  'Yemen Combat Intel': { lat: 15.3694, lng: 44.191, name: 'Sanaa' },
  'Belarus Border Intel': { lat: 53.9045, lng: 27.5615, name: 'Minsk' },
  'Poland Security Monitor': { lat: 52.2297, lng: 21.0122, name: 'Warsaw' },
  'Moldova Security Intel': { lat: 47.0105, lng: 28.8638, name: 'Chisinau' },
  'Baltic Monitor (Latvia)': { lat: 56.9496, lng: 24.1052, name: 'Riga' },
  'Baltic Monitor (Estonia)': { lat: 59.437, lng: 24.7536, name: 'Tallinn' },
  'Baltic Monitor (Lithuania)': { lat: 54.6872, lng: 25.2797, name: 'Vilnius' },
  'Finland security Intel': { lat: 60.1699, lng: 24.9384, name: 'Helsinki' },
  'Greece-Turkey Monitor': { lat: 37.9838, lng: 23.7275, name: 'Athens' },
  'Georgia Unrest Intel': { lat: 41.7151, lng: 44.8271, name: 'Tbilisi' },
  'Ukraine Combat Intel': { lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  'Russia Conflict Monitor': { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  'Afghanistan Top': { lat: 34.5553, lng: 69.2075, name: 'Kabul' },
  'Afghanistan Crisis': { lat: 34.5553, lng: 69.2075, name: 'Kabul' },
  'Armenia Top': { lat: 40.1772, lng: 44.5035, name: 'Yerevan' },
  'Armenia Crisis': { lat: 40.1772, lng: 44.5035, name: 'Yerevan' },
  'Azerbaijan Top': { lat: 40.4093, lng: 49.8671, name: 'Baku' },
  'Azerbaijan Crisis': { lat: 40.4093, lng: 49.8671, name: 'Baku' },
  'Bangladesh Top': { lat: 23.8103, lng: 90.4125, name: 'Dhaka' },
  'Bangladesh Crisis': { lat: 23.8103, lng: 90.4125, name: 'Dhaka' },
  'Cambodia Top': { lat: 11.5564, lng: 104.9282, name: 'Phnom Penh' },
  'Cambodia Crisis': { lat: 11.5564, lng: 104.9282, name: 'Phnom Penh' },
  'China Top': { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
  'China Crisis': { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
  'Georgia Top': { lat: 41.7151, lng: 44.8271, name: 'Tbilisi' },
  'Georgia Crisis': { lat: 41.7151, lng: 44.8271, name: 'Tbilisi' },
  'Hong Kong Top': { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
  'Hong Kong Crisis': { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
  'India Top': { lat: 28.6139, lng: 77.209, name: 'New Delhi' },
  'India Crisis': { lat: 28.6139, lng: 77.209, name: 'New Delhi' },
  'Indonesia Top': { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
  'Indonesia Crisis': { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
  'Japan Top': { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  'Japan Crisis': { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  'Kazakhstan Top': { lat: 51.1605, lng: 71.4272, name: 'Astana' },
  'Kazakhstan Crisis': { lat: 51.1605, lng: 71.4272, name: 'Astana' },
  'Kyrgyzstan Top': { lat: 42.8746, lng: 74.5698, name: 'Bishkek' },
  'Kyrgyzstan Crisis': { lat: 42.8746, lng: 74.5698, name: 'Bishkek' },
  'Laos Top': { lat: 17.9757, lng: 102.6331, name: 'Vientiane' },
  'Laos Crisis': { lat: 17.9757, lng: 102.6331, name: 'Vientiane' },
  'Malaysia Top': { lat: 3.139, lng: 101.6869, name: 'Kuala Lumpur' },
  'Malaysia Crisis': { lat: 3.139, lng: 101.6869, name: 'Kuala Lumpur' },
  'Mongolia Top': { lat: 47.8864, lng: 106.9057, name: 'Ulaanbaatar' },
  'Mongolia Crisis': { lat: 47.8864, lng: 106.9057, name: 'Ulaanbaatar' },
  'Myanmar Top': { lat: 19.7633, lng: 96.0785, name: 'Naypyidaw' },
  'Myanmar Crisis': { lat: 19.7633, lng: 96.0785, name: 'Naypyidaw' },
  'Nepal Top': { lat: 27.7172, lng: 85.324, name: 'Kathmandu' },
  'Nepal Crisis': { lat: 27.7172, lng: 85.324, name: 'Kathmandu' },
  'North Korea Top': { lat: 39.0392, lng: 125.7625, name: 'Pyongyang' },
  'North Korea Crisis': { lat: 39.0392, lng: 125.7625, name: 'Pyongyang' },
  'Pakistan Top': { lat: 33.6844, lng: 73.0479, name: 'Islamabad' },
  'Pakistan Crisis': { lat: 33.6844, lng: 73.0479, name: 'Islamabad' },
  'Philippines Top': { lat: 14.5995, lng: 120.9842, name: 'Manila' },
  'Philippines Crisis': { lat: 14.5995, lng: 120.9842, name: 'Manila' },
  'Singapore Top': { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  'Singapore Crisis': { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  'South Korea Top': { lat: 37.5665, lng: 126.978, name: 'Seoul' },
  'South Korea Crisis': { lat: 37.5665, lng: 126.978, name: 'Seoul' },
  'Sri Lanka Top': { lat: 6.9271, lng: 79.8612, name: 'Colombo' },
  'Sri Lanka Crisis': { lat: 6.9271, lng: 79.8612, name: 'Colombo' },
  'Taiwan Top': { lat: 25.033, lng: 121.5654, name: 'Taipei' },
  'Taiwan Crisis': { lat: 25.033, lng: 121.5654, name: 'Taipei' },
  'Tajikistan Top': { lat: 38.5358, lng: 68.7791, name: 'Dushanbe' },
  'Tajikistan Crisis': { lat: 38.5358, lng: 68.7791, name: 'Dushanbe' },
  'Thailand Top': { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
  'Thailand Crisis': { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
  'Turkmenistan Top': { lat: 37.9601, lng: 58.3261, name: 'Ashgabat' },
  'Turkmenistan Crisis': { lat: 37.9601, lng: 58.3261, name: 'Ashgabat' },
  'Uzbekistan Top': { lat: 41.2995, lng: 69.2401, name: 'Tashkent' },
  'Uzbekistan Crisis': { lat: 41.2995, lng: 69.2401, name: 'Tashkent' },
  'Vietnam Top': { lat: 21.0285, lng: 105.8542, name: 'Hanoi' },
  'Vietnam Crisis': { lat: 21.0285, lng: 105.8542, name: 'Hanoi' },
  'Algeria Top': { lat: 36.7538, lng: 3.0588, name: 'Algiers' },
  'Algeria Crisis': { lat: 36.7538, lng: 3.0588, name: 'Algiers' },
  'Angola Top': { lat: -8.839, lng: 13.2894, name: 'Luanda' },
  'Angola Crisis': { lat: -8.839, lng: 13.2894, name: 'Luanda' },
  'Benin Top': { lat: 6.3654, lng: 2.4183, name: 'Cotonou' },
  'Benin Crisis': { lat: 6.3654, lng: 2.4183, name: 'Cotonou' },
  'Burkina Faso Top': { lat: 12.3714, lng: -1.5197, name: 'Ouagadougou' },
  'Burkina Faso Crisis': { lat: 12.3714, lng: -1.5197, name: 'Ouagadougou' },
  'Burundi Top': { lat: -3.3822, lng: 29.3644, name: 'Bujumbura' },
  'Burundi Crisis': { lat: -3.3822, lng: 29.3644, name: 'Bujumbura' },
  'Cameroon Top': { lat: 3.848, lng: 11.5021, name: 'Yaoundé' },
  'Cameroon Crisis': { lat: 3.848, lng: 11.5021, name: 'Yaoundé' },
  'CAR Top': { lat: 4.3947, lng: 18.5582, name: 'Bangui' },
  'CAR Crisis': { lat: 4.3947, lng: 18.5582, name: 'Bangui' },
  'Chad Top': { lat: 12.1131, lng: 15.0357, name: "N'Djamena" },
  'Chad Crisis': { lat: 12.1131, lng: 15.0357, name: "N'Djamena" },
  "Cote d'Ivoire Top": { lat: 5.36, lng: -4.0083, name: 'Abidjan' },
  "Cote d'Ivoire Crisis": { lat: 5.36, lng: -4.0083, name: 'Abidjan' },
  'DRC Top': { lat: -4.4419, lng: 15.2663, name: 'Kinshasa' },
  'DRC Crisis': { lat: -4.4419, lng: 15.2663, name: 'Kinshasa' },
  'Djibouti Top': { lat: 11.5721, lng: 43.1456, name: 'Djibouti' },
  'Djibouti Crisis': { lat: 11.5721, lng: 43.1456, name: 'Djibouti' },
  'Ethiopia Top': { lat: 9.03, lng: 38.74, name: 'Addis Ababa' },
  'Ethiopia Crisis': { lat: 9.03, lng: 38.74, name: 'Addis Ababa' },
  'Gabon Top': { lat: 0.4162, lng: 9.4673, name: 'Libreville' },
  'Gabon Crisis': { lat: 0.4162, lng: 9.4673, name: 'Libreville' },
  'Ghana Top': { lat: 5.6037, lng: -0.187, name: 'Accra' },
  'Ghana Crisis': { lat: 5.6037, lng: -0.187, name: 'Accra' },
  'Guinea Top': { lat: 9.5092, lng: -13.7122, name: 'Conakry' },
  'Guinea Crisis': { lat: 9.5092, lng: -13.7122, name: 'Conakry' },
  'Kenya Top': { lat: -1.2921, lng: 36.8219, name: 'Nairobi' },
  'Kenya Crisis': { lat: -1.2921, lng: 36.8219, name: 'Nairobi' },
  'Libya Top': { lat: 32.8872, lng: 13.1913, name: 'Tripoli' },
  'Libya Crisis': { lat: 32.8872, lng: 13.1913, name: 'Tripoli' },
  'Mali Top': { lat: 12.6392, lng: -8.0029, name: 'Bamako' },
  'Mali Crisis': { lat: 12.6392, lng: -8.0029, name: 'Bamako' },
  'Mauritania Top': { lat: 18.0735, lng: -15.9582, name: 'Nouakchott' },
  'Mauritania Crisis': { lat: 18.0735, lng: -15.9582, name: 'Nouakchott' },
  'Morocco Top': { lat: 34.0209, lng: -6.8416, name: 'Rabat' },
  'Morocco Crisis': { lat: 34.0209, lng: -6.8416, name: 'Rabat' },
  'Mozambique Top': { lat: -25.9692, lng: 32.5732, name: 'Maputo' },
  'Mozambique Crisis': { lat: -25.9692, lng: 32.5732, name: 'Maputo' },
  'Niger Top': { lat: 13.5116, lng: 2.1254, name: 'Niamey' },
  'Niger Crisis': { lat: 13.5116, lng: 2.1254, name: 'Niamey' },
  'Nigeria Top': { lat: 9.0765, lng: 7.3986, name: 'Abuja' },
  'Nigeria Crisis': { lat: 9.0765, lng: 7.3986, name: 'Abuja' },
  'Rwanda Top': { lat: -1.9441, lng: 30.0619, name: 'Kigali' },
  'Rwanda Crisis': { lat: -1.9441, lng: 30.0619, name: 'Kigali' },
  'Senegal Top': { lat: 14.6927, lng: -17.4467, name: 'Dakar' },
  'Senegal Crisis': { lat: 14.6927, lng: -17.4467, name: 'Dakar' },
  'Somalia Top': { lat: 2.0469, lng: 45.3182, name: 'Mogadishu' },
  'Somalia Crisis': { lat: 2.0469, lng: 45.3182, name: 'Mogadishu' },
  'South Africa Top': { lat: -25.7479, lng: 28.2293, name: 'Pretoria' },
  'South Africa Crisis': { lat: -25.7479, lng: 28.2293, name: 'Pretoria' },
  'South Sudan Top': { lat: 4.8594, lng: 31.5713, name: 'Juba' },
  'South Sudan Crisis': { lat: 4.8594, lng: 31.5713, name: 'Juba' },
  'Sudan Top': { lat: 15.5007, lng: 32.5599, name: 'Khartoum' },
  'Sudan Crisis': { lat: 15.5007, lng: 32.5599, name: 'Khartoum' },
  'Tanzania Top': { lat: -6.7924, lng: 39.2083, name: 'Dodoma' },
  'Tanzania Crisis': { lat: -6.7924, lng: 39.2083, name: 'Dodoma' },
  'Tunisia Top': { lat: 36.8065, lng: 10.1815, name: 'Tunis' },
  'Tunisia Crisis': { lat: 36.8065, lng: 10.1815, name: 'Tunis' },
  'Uganda Top': { lat: 0.3476, lng: 32.5825, name: 'Kampala' },
  'Uganda Crisis': { lat: 0.3476, lng: 32.5825, name: 'Kampala' },
  'Zambia Top': { lat: -15.3875, lng: 28.3228, name: 'Lusaka' },
  'Zambia Crisis': { lat: -15.3875, lng: 28.3228, name: 'Lusaka' },
  'Zimbabwe Top': { lat: -17.8252, lng: 31.0335, name: 'Harare' },
  'Zimbabwe Crisis': { lat: -17.8252, lng: 31.0335, name: 'Harare' },
  'BBC News World': { lat: 51.5074, lng: -0.1278, name: 'London' },
  'Al Jazeera World': { lat: 25.2854, lng: 51.531, name: 'Doha' },
  'Reuters Intel': { lat: 51.5074, lng: -0.1278, name: 'London' },
  'USA Top': { lat: 38.8951, lng: -77.0364, name: 'Washington D.C.' },
  'USA Crisis': { lat: 38.8951, lng: -77.0364, name: 'Washington D.C.' },
  'Canada Top': { lat: 45.4215, lng: -75.6972, name: 'Ottawa' },
  'Canada Crisis': { lat: 45.4215, lng: -75.6972, name: 'Ottawa' },
  'Mexico Top': { lat: 19.4326, lng: -99.1332, name: 'Mexico City' },
  'Mexico Crisis': { lat: 19.4326, lng: -99.1332, name: 'Mexico City' },
  'Greenland Top': { lat: 64.1814, lng: -51.6941, name: 'Nuuk' },
  'Greenland Crisis': { lat: 64.1814, lng: -51.6941, name: 'Nuuk' },
  'Belize Top': { lat: 17.251, lng: -88.759, name: 'Belmopan' },
  'Belize Crisis': { lat: 17.251, lng: -88.759, name: 'Belmopan' },
  'Guatemala Top': { lat: 14.6349, lng: -90.5069, name: 'Guatemala City' },
  'Guatemala Crisis': { lat: 14.6349, lng: -90.5069, name: 'Guatemala City' },
  'El Salvador Top': { lat: 13.6929, lng: -89.2182, name: 'San Salvador' },
  'El Salvador Crisis': { lat: 13.6929, lng: -89.2182, name: 'San Salvador' },
  'Honduras Top': { lat: 14.0723, lng: -87.1921, name: 'Tegucigalpa' },
  'Honduras Crisis': { lat: 14.0723, lng: -87.1921, name: 'Tegucigalpa' },
  'Nicaragua Top': { lat: 12.115, lng: -86.2362, name: 'Managua' },
  'Nicaragua Crisis': { lat: 12.115, lng: -86.2362, name: 'Managua' },
  'Costa Rica Top': { lat: 9.9281, lng: -84.0907, name: 'San José' },
  'Costa Rica Crisis': { lat: 9.9281, lng: -84.0907, name: 'San José' },
  'Panama Top': { lat: 8.9819, lng: -79.5192, name: 'Panama City' },
  'Panama Crisis': { lat: 8.9819, lng: -79.5192, name: 'Panama City' },
  'Haiti Top': { lat: 18.5392, lng: -72.335, name: 'Port-au-Prince' },
  'Haiti Crisis': { lat: 18.5392, lng: -72.335, name: 'Port-au-Prince' },
  'Cuba Top': { lat: 23.1136, lng: -82.3666, name: 'Havana' },
  'Cuba Crisis': { lat: 23.1136, lng: -82.3666, name: 'Havana' },
  'Dominican Republic Top': { lat: 18.4861, lng: -69.9312, name: 'Santo Domingo' },
  'Dominican Republic Crisis': { lat: 18.4861, lng: -69.9312, name: 'Santo Domingo' },
  'Jamaica Top': { lat: 18.0179, lng: -76.8099, name: 'Kingston' },
  'Jamaica Crisis': { lat: 18.0179, lng: -76.8099, name: 'Kingston' },
  'Bahamas Top': { lat: 25.0443, lng: -77.3504, name: 'Nassau' },
  'Bahamas Crisis': { lat: 25.0443, lng: -77.3504, name: 'Nassau' },
  'Trinidad and Tobago Top': { lat: 10.6667, lng: -61.5167, name: 'Port of Spain' },
  'Trinidad and Tobago Crisis': { lat: 10.6667, lng: -61.5167, name: 'Port of Spain' },
  'Argentina Top': { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires' },
  'Argentina Crisis': { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires' },
  'Bolivia Top': { lat: -16.4897, lng: -68.1193, name: 'La Paz' },
  'Bolivia Crisis': { lat: -16.4897, lng: -68.1193, name: 'La Paz' },
  'Brazil Top': { lat: -15.7975, lng: -47.8919, name: 'Brasília' },
  'Brazil Crisis': { lat: -15.7975, lng: -47.8919, name: 'Brasília' },
  'Chile Top': { lat: -33.4489, lng: -70.6693, name: 'Santiago' },
  'Chile Crisis': { lat: -33.4489, lng: -70.6693, name: 'Santiago' },
  'Colombia Top': { lat: 4.711, lng: -74.0721, name: 'Bogotá' },
  'Colombia Crisis': { lat: 4.711, lng: -74.0721, name: 'Bogotá' },
  'Ecuador Top': { lat: -0.1807, lng: -78.4678, name: 'Quito' },
  'Ecuador Crisis': { lat: -0.1807, lng: -78.4678, name: 'Quito' },
  'Guyana Top': { lat: 6.8013, lng: -58.1551, name: 'Georgetown' },
  'Guyana Crisis': { lat: 6.8013, lng: -58.1551, name: 'Georgetown' },
  'Paraguay Top': { lat: -25.2637, lng: -57.5759, name: 'Asunción' },
  'Paraguay Crisis': { lat: -25.2637, lng: -57.5759, name: 'Asunción' },
  'Peru Top': { lat: -12.0464, lng: -77.0428, name: 'Lima' },
  'Peru Crisis': { lat: -12.0464, lng: -77.0428, name: 'Lima' },
  'Suriname Top': { lat: 5.852, lng: -55.2038, name: 'Paramaribo' },
  'Suriname Crisis': { lat: 5.852, lng: -55.2038, name: 'Paramaribo' },
  'Uruguay Top': { lat: -34.9011, lng: -56.1645, name: 'Montevideo' },
  'Uruguay Crisis': { lat: -34.9011, lng: -56.1645, name: 'Montevideo' },
  'Venezuela Top': { lat: 10.4806, lng: -66.9036, name: 'Caracas' },
  'Venezuela Crisis': { lat: 10.4806, lng: -66.9036, name: 'Caracas' },
};

function parseGdeltDate(dateStr: string) {
  if (!dateStr) return new Date().toISOString();
  try {
    if (dateStr.length === 16 && dateStr.includes('T') && dateStr.endsWith('Z')) {
      const str = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${dateStr.slice(9, 11)}:${dateStr.slice(11, 13)}:${dateStr.slice(13, 15)}Z`;
      return new Date(str).toISOString();
    }
  } catch (e) { }
  return new Date().toISOString();
}
const LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  // --- MIDDLE EAST ---
  gaza: { lat: 31.4167, lng: 34.3333, name: 'Gaza Strip' },
  'gaza strip': { lat: 31.4167, lng: 34.3333, name: 'Gaza Strip' },
  rafah: { lat: 31.2803, lng: 34.2443, name: 'Rafah' },
  'khan younis': { lat: 31.3462, lng: 34.3063, name: 'Khan Younis' },
  jabalia: { lat: 31.5322, lng: 34.4834, name: 'Jabalia' },
  'beit lahia': { lat: 31.5508, lng: 34.4942, name: 'Beit Lahia' },
  'west bank': { lat: 32.0, lng: 35.25, name: 'West Bank' },
  jenin: { lat: 32.4639, lng: 35.2955, name: 'Jenin' },
  nablus: { lat: 32.2211, lng: 35.2544, name: 'Nablus' },
  hebron: { lat: 31.5326, lng: 35.0998, name: 'Hebron' },
  ramallah: { lat: 31.9029, lng: 35.2062, name: 'Ramallah' },
  'tel aviv': { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  jerusalem: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  haifa: { lat: 32.794, lng: 34.9896, name: 'Haifa' },
  israel: { lat: 31.0461, lng: 34.8516, name: 'Israel' },
  netanyahu: { lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  idf: { lat: 31.0461, lng: 34.8516, name: 'Israel' },
  hamas: { lat: 31.4167, lng: 34.3333, name: 'Gaza' },
  beirut: { lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  tripoli: { lat: 34.4367, lng: 35.8497, name: 'Tripoli (Lebanon)' },
  sidon: { lat: 33.5606, lng: 35.3714, name: 'Sidon' },
  tyre: { lat: 33.2705, lng: 35.2038, name: 'Tyre' },
  'south lebanon': { lat: 33.2721, lng: 35.2016, name: 'South Lebanon' },
  lebanon: { lat: 33.8547, lng: 35.8623, name: 'Lebanon' },
  hezbollah: { lat: 33.2721, lng: 35.2016, name: 'South Lebanon' },
  damascus: { lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  aleppo: { lat: 36.2021, lng: 37.1343, name: 'Aleppo' },
  idlib: { lat: 35.9306, lng: 36.6339, name: 'Idlib' },
  'deir ez-zor': { lat: 35.336, lng: 40.141, name: 'Deir ez-Zor' },
  raqqa: { lat: 35.9516, lng: 39.005, name: 'Raqqa' },
  homs: { lat: 34.7324, lng: 36.7137, name: 'Homs' },
  hama: { lat: 35.1317, lng: 36.7565, name: 'Hama' },
  kobani: { lat: 36.8934, lng: 38.3566, name: 'Kobani' },
  afrin: { lat: 36.5071, lng: 36.8697, name: 'Afrin' },
  syria: { lat: 34.8021, lng: 38.9968, name: 'Syria' },
  tehran: { lat: 35.6892, lng: 51.389, name: 'Tehran' },
  isfahan: { lat: 32.6546, lng: 51.668, name: 'Isfahan' },
  mashhad: { lat: 36.2605, lng: 59.6168, name: 'Mashhad' },
  iran: { lat: 32.4279, lng: 53.688, name: 'Iran' },
  irgc: { lat: 35.6892, lng: 51.389, name: 'Tehran' },
  khamenei: { lat: 35.6892, lng: 51.389, name: 'Tehran' },
  baghdad: { lat: 33.3128, lng: 44.3615, name: 'Baghdad' },
  mosul: { lat: 36.335, lng: 43.1189, name: 'Mosul' },
  basra: { lat: 30.5085, lng: 47.7835, name: 'Basra' },
  erbil: { lat: 36.1901, lng: 44.009, name: 'Erbil' },
  kirkuk: { lat: 35.4681, lng: 44.3922, name: 'Kirkuk' },
  fallujah: { lat: 33.3504, lng: 43.7842, name: 'Fallujah' },
  iraq: { lat: 33.2232, lng: 43.6793, name: 'Iraq' },
  sanaa: { lat: 15.3694, lng: 44.191, name: 'Sanaa' },
  aden: { lat: 12.7797, lng: 45.0368, name: 'Aden' },
  marib: { lat: 15.4683, lng: 45.3225, name: 'Marib' },
  hodeidah: { lat: 14.7978, lng: 42.9545, name: 'Hodeidah' },
  houthi: { lat: 15.3694, lng: 44.191, name: 'Sanaa (Houthi)' },
  ansarallah: { lat: 15.3694, lng: 44.191, name: 'Yemen (Ansarallah)' },
  'red sea': { lat: 20.0, lng: 38.0, name: 'Red Sea' },
  'bab el-mandeb': { lat: 12.5833, lng: 43.4167, name: 'Bab el-Mandeb Strait' },
  'strait of hormuz': { lat: 26.5667, lng: 56.25, name: 'Strait of Hormuz' },
  hormuz: { lat: 26.5667, lng: 56.25, name: 'Strait of Hormuz' },
  yemen: { lat: 15.5527, lng: 48.5164, name: 'Yemen' },
  riyadh: { lat: 24.7136, lng: 46.6753, name: 'Riyadh' },
  jeddah: { lat: 21.4858, lng: 39.1925, name: 'Jeddah' },
  'saudi arabia': { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
  'abu dhabi': { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi' },
  dubai: { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
  uae: { lat: 23.4241, lng: 53.8478, name: 'UAE' },
  doha: { lat: 25.2854, lng: 51.531, name: 'Doha' },
  qatar: { lat: 25.3548, lng: 51.1839, name: 'Qatar' },
  kuwait: { lat: 29.3759, lng: 47.9774, name: 'Kuwait' },
  manama: { lat: 26.2235, lng: 50.5876, name: 'Manama' },
  bahrain: { lat: 26.0275, lng: 50.55, name: 'Bahrain' },
  muscat: { lat: 23.588, lng: 58.3829, name: 'Muscat' },
  oman: { lat: 21.4735, lng: 55.9754, name: 'Oman' },
  ankara: { lat: 39.9334, lng: 32.8597, name: 'Ankara' },
  istanbul: { lat: 41.0082, lng: 28.9784, name: 'Istanbul' },
  turkey: { lat: 38.9637, lng: 35.2433, name: 'Turkey' },
  türkiye: { lat: 38.9637, lng: 35.2433, name: 'Türkiye' },
  erdogan: { lat: 39.9334, lng: 32.8597, name: 'Ankara' },
  kabul: { lat: 34.5553, lng: 69.2075, name: 'Kabul' },
  kandahar: { lat: 31.6289, lng: 65.7372, name: 'Kandahar' },
  afghanistan: { lat: 33.9391, lng: 67.71, name: 'Afghanistan' },
  taliban: { lat: 33.9391, lng: 67.71, name: 'Afghanistan' },

  // --- AFRICA ---
  cairo: { lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  egypt: { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
  khartoum: { lat: 15.5007, lng: 32.5599, name: 'Khartoum' },
  darfur: { lat: 13.626, lng: 24.0384, name: 'Darfur' },
  'el fasher': { lat: 13.6289, lng: 25.3498, name: 'El Fasher' },
  omdurman: { lat: 15.6445, lng: 32.4777, name: 'Omdurman' },
  'port sudan': { lat: 19.6204, lng: 37.2166, name: 'Port Sudan' },
  sudan: { lat: 12.8628, lng: 30.2176, name: 'Sudan' },
  rsf: { lat: 15.5007, lng: 32.5599, name: 'Khartoum (RSF)' },
  'addis ababa': { lat: 9.0249, lng: 38.7468, name: 'Addis Ababa' },
  tigray: { lat: 14.0, lng: 39.0, name: 'Tigray' },
  amhara: { lat: 11.0, lng: 37.5, name: 'Amhara' },
  oromia: { lat: 7.8534, lng: 39.4997, name: 'Oromia' },
  ethiopia: { lat: 9.145, lng: 40.4897, name: 'Ethiopia' },
  mogadishu: { lat: 2.0469, lng: 45.3182, name: 'Mogadishu' },
  somalia: { lat: 5.1521, lng: 46.1996, name: 'Somalia' },
  'al-shabaab': { lat: 2.0469, lng: 45.3182, name: 'Mogadishu' },
  'al shabaab': { lat: 2.0469, lng: 45.3182, name: 'Somalia' },
  nairobi: { lat: -1.2864, lng: 36.8172, name: 'Nairobi' },
  kenya: { lat: -0.0236, lng: 37.9062, name: 'Kenya' },
  kampala: { lat: 0.3163, lng: 32.5822, name: 'Kampala' },
  uganda: { lat: 1.3733, lng: 32.2903, name: 'Uganda' },
  goma: { lat: -1.6722, lng: 29.2228, name: 'Goma' },
  bukavu: { lat: -2.4982, lng: 28.8621, name: 'Bukavu' },
  kinshasa: { lat: -4.4419, lng: 15.2663, name: 'Kinshasa' },
  congo: { lat: -4.0383, lng: 21.7587, name: 'DR Congo' },
  drc: { lat: -4.0383, lng: 21.7587, name: 'DR Congo' },
  m23: { lat: -1.6722, lng: 29.2228, name: 'Goma (M23)' },
  'democratic republic of congo': { lat: -4.0383, lng: 21.7587, name: 'DR Congo' },
  abuja: { lat: 9.0579, lng: 7.4951, name: 'Abuja' },
  lagos: { lat: 6.5244, lng: 3.3792, name: 'Lagos' },
  nigeria: { lat: 9.082, lng: 8.6753, name: 'Nigeria' },
  'boko haram': { lat: 12.0, lng: 14.0, name: 'Lake Chad Basin' },
  bamako: { lat: 12.6392, lng: -8.0029, name: 'Bamako' },
  mali: { lat: 17.5707, lng: -3.9962, name: 'Mali' },
  'burkina faso': { lat: 12.364, lng: -1.5275, name: 'Burkina Faso' },
  ouagadougou: { lat: 12.365, lng: -1.5335, name: 'Ouagadougou' },
  niger: { lat: 17.6078, lng: 8.0817, name: 'Niger' },
  niamey: { lat: 13.5137, lng: 2.1098, name: 'Niamey' },
  chad: { lat: 15.4542, lng: 18.7322, name: 'Chad' },
  "n'djamena": { lat: 12.1048, lng: 15.0444, name: "N'Djamena" },
  'tripoli libya': { lat: 32.8872, lng: 13.1913, name: 'Tripoli (Libya)' },
  benghazi: { lat: 32.1167, lng: 20.0667, name: 'Benghazi' },
  libya: { lat: 26.3351, lng: 17.2283, name: 'Libya' },
  tunis: { lat: 36.8065, lng: 10.1815, name: 'Tunis' },
  tunisia: { lat: 33.8869, lng: 9.5375, name: 'Tunisia' },
  algiers: { lat: 36.7538, lng: 3.0588, name: 'Algiers' },
  algeria: { lat: 28.0339, lng: 1.6596, name: 'Algeria' },
  rabat: { lat: 34.0209, lng: -6.8416, name: 'Rabat' },
  casablanca: { lat: 33.5731, lng: -7.5898, name: 'Casablanca' },
  morocco: { lat: 31.7917, lng: -7.0926, name: 'Morocco' },
  johannesburg: { lat: -26.2041, lng: 28.0473, name: 'Johannesburg' },
  pretoria: { lat: -25.7479, lng: 28.2293, name: 'Pretoria' },
  'south africa': { lat: -30.5595, lng: 22.9375, name: 'South Africa' },
  accra: { lat: 5.6037, lng: -0.187, name: 'Accra' },
  ghana: { lat: 7.9465, lng: -1.0232, name: 'Ghana' },

  // --- EUROPE & UKRAINE ---
  kyiv: { lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  kiev: { lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  kharkiv: { lat: 50.0044, lng: 36.2315, name: 'Kharkiv' },
  kherson: { lat: 46.6354, lng: 32.6169, name: 'Kherson' },
  zaporizhzhia: { lat: 47.8388, lng: 35.1396, name: 'Zaporizhzhia' },
  odesa: { lat: 46.4825, lng: 30.7233, name: 'Odesa' },
  odessa: { lat: 46.4825, lng: 30.7233, name: 'Odesa' },
  mykolaiv: { lat: 46.9659, lng: 31.9974, name: 'Mykolaiv' },
  mariupol: { lat: 47.0594, lng: 37.5079, name: 'Mariupol' },
  bakhmut: { lat: 48.5956, lng: 38.0, name: 'Bakhmut' },
  avdiivka: { lat: 48.1346, lng: 37.7608, name: 'Avdiivka' },
  lviv: { lat: 49.8397, lng: 24.0297, name: 'Lviv' },
  dnipro: { lat: 48.4647, lng: 35.0462, name: 'Dnipro' },
  donetsk: { lat: 48.0159, lng: 37.8028, name: 'Donetsk' },
  luhansk: { lat: 48.574, lng: 39.3078, name: 'Luhansk' },
  donbas: { lat: 48.2, lng: 38.0, name: 'Donbas' },
  donbass: { lat: 48.2, lng: 38.0, name: 'Donbas' },
  crimea: { lat: 45.3183, lng: 34.1398, name: 'Crimea' },
  sevastopol: { lat: 44.6167, lng: 33.5167, name: 'Sevastopol' },
  ukraine: { lat: 48.3794, lng: 31.1656, name: 'Ukraine' },
  zelensky: { lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  zelenskyy: { lat: 50.4501, lng: 30.5234, name: 'Kyiv' },
  moscow: { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  kremlin: { lat: 55.752, lng: 37.6175, name: 'Moscow (Kremlin)' },
  putin: { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  'st petersburg': { lat: 59.9311, lng: 30.3609, name: 'St. Petersburg' },
  'saint petersburg': { lat: 59.9311, lng: 30.3609, name: 'St. Petersburg' },
  russia: { lat: 55.7558, lng: 37.6173, name: 'Russia' },
  russian: { lat: 55.7558, lng: 37.6173, name: 'Russia' },
  minsk: { lat: 53.9045, lng: 27.5615, name: 'Minsk' },
  belarus: { lat: 53.7098, lng: 27.9534, name: 'Belarus' },
  lukashenko: { lat: 53.9045, lng: 27.5615, name: 'Minsk' },
  warsaw: { lat: 52.2297, lng: 21.0122, name: 'Warsaw' },
  poland: { lat: 51.9194, lng: 19.1451, name: 'Poland' },
  budapest: { lat: 47.4979, lng: 19.0402, name: 'Budapest' },
  hungary: { lat: 47.1625, lng: 19.5033, name: 'Hungary' },
  orban: { lat: 47.4979, lng: 19.0402, name: 'Budapest' },
  bucharest: { lat: 44.4268, lng: 26.1025, name: 'Bucharest' },
  romania: { lat: 45.9432, lng: 24.9668, name: 'Romania' },
  sofia: { lat: 42.6977, lng: 23.3219, name: 'Sofia' },
  bulgaria: { lat: 42.7339, lng: 25.4858, name: 'Bulgaria' },
  belgrade: { lat: 44.8176, lng: 20.4633, name: 'Belgrade' },
  serbia: { lat: 44.0165, lng: 21.0059, name: 'Serbia' },
  pristina: { lat: 42.6629, lng: 21.1655, name: 'Pristina' },
  kosovo: { lat: 42.6026, lng: 20.903, name: 'Kosovo' },
  paris: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
  france: { lat: 46.2276, lng: 2.2137, name: 'France' },
  macron: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
  berlin: { lat: 52.52, lng: 13.405, name: 'Berlin' },
  germany: { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  rome: { lat: 41.9028, lng: 12.4964, name: 'Rome' },
  italy: { lat: 41.8719, lng: 12.5674, name: 'Italy' },
  madrid: { lat: 40.4168, lng: -3.7038, name: 'Madrid' },
  spain: { lat: 40.4637, lng: -3.7492, name: 'Spain' },
  london: { lat: 51.5074, lng: -0.1278, name: 'London' },
  'united kingdom': { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
  uk: { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
  britain: { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
  british: { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
  nato: { lat: 50.8503, lng: 4.3517, name: 'Brussels (NATO)' },
  brussels: { lat: 50.8503, lng: 4.3517, name: 'Brussels' },
  'european union': { lat: 50.8503, lng: 4.3517, name: 'Brussels (EU)' },
  eu: { lat: 50.8503, lng: 4.3517, name: 'Brussels (EU)' },
  stockholm: { lat: 59.3293, lng: 18.0686, name: 'Stockholm' },
  sweden: { lat: 60.1282, lng: 18.6435, name: 'Sweden' },
  helsinki: { lat: 60.1699, lng: 24.9384, name: 'Helsinki' },
  finland: { lat: 61.9241, lng: 25.7482, name: 'Finland' },
  oslo: { lat: 59.9139, lng: 10.7522, name: 'Oslo' },
  norway: { lat: 60.472, lng: 8.4689, name: 'Norway' },
  amsterdam: { lat: 52.3676, lng: 4.9041, name: 'Amsterdam' },
  netherlands: { lat: 52.1326, lng: 5.2913, name: 'Netherlands' },
  athens: { lat: 37.9838, lng: 23.7275, name: 'Athens' },
  greece: { lat: 39.0742, lng: 21.8243, name: 'Greece' },
  vienna: { lat: 48.2082, lng: 16.3738, name: 'Vienna' },
  austria: { lat: 47.5162, lng: 14.5501, name: 'Austria' },
  zurich: { lat: 47.3769, lng: 8.5417, name: 'Zurich' },
  geneva: { lat: 46.2044, lng: 6.1432, name: 'Geneva' },
  switzerland: { lat: 46.8182, lng: 8.2275, name: 'Switzerland' },
  nicosia: { lat: 35.1856, lng: 33.3823, name: 'Nicosia' },
  cyprus: { lat: 35.1264, lng: 33.4299, name: 'Cyprus' },
  kıbrıs: { lat: 35.1264, lng: 33.4299, name: 'Cyprus' },

  // --- ASIA & PACIFIC ---
  beijing: { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
  shanghai: { lat: 31.2304, lng: 121.4737, name: 'Shanghai' },
  'xi jinping': { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
  china: { lat: 35.8617, lng: 104.1954, name: 'China' },
  chinese: { lat: 35.8617, lng: 104.1954, name: 'China' },
  pla: { lat: 39.9042, lng: 116.4074, name: 'Beijing (PLA)' },
  'south china sea': { lat: 15.0, lng: 115.0, name: 'South China Sea' },
  'taiwan strait': { lat: 24.0, lng: 119.5, name: 'Taiwan Strait' },
  taipei: { lat: 25.033, lng: 121.5654, name: 'Taipei' },
  taiwan: { lat: 23.6978, lng: 120.9605, name: 'Taiwan' },
  tokyo: { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
  japan: { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  japanese: { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  hiroshima: { lat: 34.3853, lng: 132.4553, name: 'Hiroshima' },
  seoul: { lat: 37.5665, lng: 126.978, name: 'Seoul' },
  'south korea': { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
  'north korea': { lat: 40.3399, lng: 127.5101, name: 'North Korea' },
  pyongyang: { lat: 39.0392, lng: 125.7625, name: 'Pyongyang' },
  'kim jong un': { lat: 39.0392, lng: 125.7625, name: 'Pyongyang' },
  'indian ocean': { lat: -20.0, lng: 80.0, name: 'Indian Ocean' },
  'new delhi': { lat: 28.6139, lng: 77.209, name: 'New Delhi' },
  mumbai: { lat: 19.076, lng: 72.8777, name: 'Mumbai' },
  delhi: { lat: 28.6139, lng: 77.209, name: 'Delhi' },
  modi: { lat: 28.6139, lng: 77.209, name: 'New Delhi' },
  india: { lat: 20.5937, lng: 78.9629, name: 'India' },
  indian: { lat: 20.5937, lng: 78.9629, name: 'India' },
  kashmir: { lat: 34.0837, lng: 74.7973, name: 'Kashmir' },
  islamabad: { lat: 33.7294, lng: 73.0931, name: 'Islamabad' },
  karachi: { lat: 24.8607, lng: 67.0011, name: 'Karachi' },
  lahore: { lat: 31.5204, lng: 74.3587, name: 'Lahore' },
  pakistan: { lat: 30.3753, lng: 69.3451, name: 'Pakistan' },
  balochistan: { lat: 28.4907, lng: 65.0958, name: 'Balochistan' },
  dhaka: { lat: 23.8103, lng: 90.4125, name: 'Dhaka' },
  bangladesh: { lat: 23.685, lng: 90.3563, name: 'Bangladesh' },
  naypyidaw: { lat: 19.7633, lng: 96.0785, name: 'Naypyidaw' },
  yangon: { lat: 16.8661, lng: 96.1951, name: 'Yangon' },
  myanmar: { lat: 19.1, lng: 96.0, name: 'Myanmar' },
  junta: { lat: 19.7633, lng: 96.0785, name: 'Naypyidaw (Junta)' },
  rakhine: { lat: 20.1, lng: 92.9, name: 'Rakhine' },
  arakan: { lat: 20.1, lng: 92.9, name: 'Arakan' },
  kachin: { lat: 25.5, lng: 97.5, name: 'Kachin' },
  shan: { lat: 21.5, lng: 98.5, name: 'Shan State' },
  bangkok: { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
  thailand: { lat: 15.87, lng: 100.9925, name: 'Thailand' },
  manila: { lat: 14.5995, lng: 120.9842, name: 'Manila' },
  philippines: { lat: 12.8797, lng: 121.774, name: 'Philippines' },
  jakara: { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
  jakarta: { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
  indonesia: { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
  yerevan: { lat: 40.1792, lng: 44.4991, name: 'Yerevan' },
  armenia: { lat: 40.0691, lng: 45.0382, name: 'Armenia' },
  baku: { lat: 40.4093, lng: 49.8671, name: 'Baku' },
  azerbaijan: { lat: 40.1431, lng: 47.5769, name: 'Azerbaijan' },
  'nagorno-karabakh': { lat: 39.8265, lng: 46.7629, name: 'Nagorno-Karabakh' },
  karabakh: { lat: 39.8265, lng: 46.7629, name: 'Karabakh' },
  tbilisi: { lat: 41.6938, lng: 44.8015, name: 'Tbilisi' },
  georgia: { lat: 42.3154, lng: 43.3569, name: 'Georgia' },

  // --- AMERICAS ---
  washington: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  'washington dc': { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  'white house': { lat: 38.8977, lng: -77.0365, name: 'White House' },
  pentagon: { lat: 38.8719, lng: -77.0563, name: 'Pentagon' },
  'new york': { lat: 40.7128, lng: -74.006, name: 'New York' },
  'los angeles': { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
  trump: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  biden: { lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  congress: { lat: 38.8899, lng: -77.0091, name: 'US Capitol' },
  'united states': { lat: 37.0902, lng: -95.7129, name: 'USA' },
  usa: { lat: 37.0902, lng: -95.7129, name: 'USA' },
  'u.s.': { lat: 37.0902, lng: -95.7129, name: 'USA' },
  american: { lat: 37.0902, lng: -95.7129, name: 'USA' },
  'mexico city': { lat: 19.4326, lng: -99.1332, name: 'Mexico City' },
  mexico: { lat: 23.6345, lng: -102.5528, name: 'Mexico' },
  sinaloa: { lat: 25.0, lng: -107.0, name: 'Sinaloa' },
  jalisco: { lat: 20.6597, lng: -103.3496, name: 'Jalisco' },
  bogota: { lat: 4.711, lng: -74.0721, name: 'Bogotá' },
  colombia: { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
  caracas: { lat: 10.4806, lng: -66.9036, name: 'Caracas' },
  venezuela: { lat: 6.4238, lng: -66.5897, name: 'Venezuela' },
  maduro: { lat: 10.4806, lng: -66.9036, name: 'Caracas' },
  brasilia: { lat: -15.7801, lng: -47.9292, name: 'Brasília' },
  'sao paulo': { lat: -23.5505, lng: -46.6333, name: 'São Paulo' },
  brazil: { lat: -14.235, lng: -51.9253, name: 'Brazil' },
  lula: { lat: -15.7801, lng: -47.9292, name: 'Brasília' },
  'buenos aires': { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires' },
  argentina: { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
  santiago: { lat: -33.4569, lng: -70.6483, name: 'Santiago' },
  chile: { lat: -35.6751, lng: -71.543, name: 'Chile' },
  lima: { lat: -12.0464, lng: -77.0428, name: 'Lima' },
  peru: { lat: -9.19, lng: -75.0152, name: 'Peru' },
  'port-au-prince': { lat: 18.5944, lng: -72.3074, name: 'Port-au-Prince' },
  haiti: { lat: 18.9712, lng: -72.2852, name: 'Haiti' },
  havana: { lat: 23.1136, lng: -82.3666, name: 'Havana' },
  cuba: { lat: 21.5218, lng: -77.7812, name: 'Cuba' },
  ottawa: { lat: 45.4215, lng: -75.6972, name: 'Ottawa' },
  canada: { lat: 56.1304, lng: -106.3468, name: 'Canada' },
};

// Alias map for common journalistic shorthand
const LOCATION_ALIASES: Record<string, string> = {
  'u.s.': 'usa',
  'u.s.a.': 'usa',
  'the u.s.': 'usa',
  'u.k.': 'uk',
  'great britain': 'united kingdom',
  kyiev: 'kyiv',
  kiyv: 'kyiv',
  odessa: 'odesa',
  türkiye: 'turkey',
  'hamas-run': 'hamas',
  'al-qaeda': 'afghanistan',
  isis: 'iraq',
  isil: 'iraq',
  'islamic state': 'iraq',
};

const SORTED_LOCATION_KEYS = Object.keys(LOCATIONS).sort((a, b) => b.length - a.length);

// Pre-compile all location regexes ONCE at startup for ~10x performance improvement
const LOCATION_REGEXES: Record<string, RegExp> = {};
for (const key of SORTED_LOCATION_KEYS) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  LOCATION_REGEXES[key] = new RegExp(`\\b${escaped}\\b`, 'gi');
}

// Title-based dedup helper: hash first 80 normalized chars of title
function titleHash(title: string): string {
  return crypto
    .createHash('md5')
    .update(
      title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 80)
    )
    .digest('hex');
}

function processItems(items: any[]): any[] {
  return items
    .map((item: any) => {
      // Normalize aliases in text first
      let title = (item.title || '').toLowerCase();
      let desc = (item.description || '').toLowerCase();
      for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
        title = title.replace(new RegExp(`\\b${alias}\\b`, 'g'), canonical);
        desc = desc.replace(new RegExp(`\\b${alias}\\b`, 'g'), canonical);
      }
      const fullText = title + ' ' + desc;

      // ── NOISE FILTER: reject entertainment / gaming / sports / lifestyle / financial markets ──
      if (
        /(premier league|champions league|la liga|serie a|bundesliga|ligue 1|eredivisie|\bnba\b|\bnfl\b|\bnhl\b|\bmlb\b|\bnascar\b|formula[\s-]?1|\bf1 race\b|golf|cricket|tennis|grand slam|wimbledon|super bowl|oscar|grammy|emmy|golden globe|celebrity|kardashian|taylor swift|beyonce|kanye|box office|blockbuster film|movie review|album review|music video|spotify|apple music|netflix|disney\+|hbo max|streaming series|series premiere|season finale|fashion week|runway|\bvogue\b|skincare|video game|\bgaming\b|\besport\b|battle royale|warzone|fortnite|valorant|minecraft|\bwow\b|world of warcraft|playstation|\bxbox\b|nintendo|steam sale|game review|game update|\bcryptocurrency\b|\bbitcoin\b|\bethereum\b|\bnft\b|\bweb3\b|\bmetaverse\b|crypto price|\biphone\b|\bandroid app\b|apple watch|samsung galaxy|tech review|product launch|restaurant review|food festival|\bwedding\b|baby shower|reality tv|dating show|tabloid|\bnasdaq\b|\bnyse\b|dow jones|s&p 500|stock market|stocks rally|shares tumble|shares fall|wall street|inflation rate|federal reserve|central bank|economic growth|interest rate|stock exchange)/i.test(
          fullText
        )
      )
        return null;

      // ----- LOCATION SCORING (regex-only, fast) -----
      const PUBLISHER_HUBS = [
        'paris',
        'france',
        'london',
        'uk',
        'united kingdom',
        'britain',
        'british',
        'washington dc',
        'washington',
        'new york',
        'usa',
        'united states',
        'american',
        'geneva',
        'switzerland',
        'brussels',
        'eu',
        'european union',
        'nato',
        'moscow',
        'russia',
        'russian',
        'beijing',
        'china',
        'chinese',
        'dubai',
        'doha',
        'qatar',
        'istanbul',
      ];

      // Evaluate standard keyword mentions
      const locationScores: Record<string, number> = {};
      for (const key of SORTED_LOCATION_KEYS) {
        const regex = LOCATION_REGEXES[key];
        regex.lastIndex = 0;
        const titleMatches = (title.match(regex) || []).length;
        regex.lastIndex = 0;
        const descMatches = (desc.match(regex) || []).length;

        if (titleMatches > 0 || descMatches > 0) {
          let score = titleMatches * 5 + descMatches * 1; // Heavy title bias

          // PENALTY: Downgrade known journalistic/diplomatic hubs so the *target* of the news wins.
          if (PUBLISHER_HUBS.includes(key)) {
            score -= 15;
          }

          locationScores[key] = score;
        }
      }

      // Pick the key with the highest weighted score
      let bestLocationKey: string | null = null;
      let bestScore = 0;
      for (const [key, score] of Object.entries(locationScores)) {
        if (score > bestScore) {
          bestScore = score;
          bestLocationKey = key;
        }
      }

      // ----- REGION CLASSIFICATION -----
      let region = item.region;
      // Re-classify 'Global'-tagged items too — BBC/Reuters/AJ feeds use 'Global' but
      // the content may be firmly geolocalised; keyword match overrides the generic tag.
      if (!region || region === 'Global') {
        if (
          /(iraq|iran|israel|syria|palestine|gaza|hamas|hezbollah|houthi|yemen|lebanon|qatar|dubai|tehran|baghdad|beirut|damascus|riyadh|saudi arabia|uae|oman|kuwait|bahrain|idf|irgc|middle east)/i.test(
            fullText
          )
        )
          region = 'Middle East';
        else if (
          /(ukraine|russia|russian|kyiv|moscow|kremlin|donbas|crimea|putin|zelensky|kharkiv|zaporizhzhia|odesa|donetsk|luhansk|serbia|kosovo|belarus|poland|france|germany|london|paris|berlin|european union)/i.test(
            fullText
          )
        )
          region = 'Europe / UKR';
        else if (
          /(taiwan|myanmar|north korea|south korea|south china sea|kashmir|seoul|tokyo|afghanistan|taliban|kabul|armenia|azerbaijan|india|pakistan|china|beijing|japan|philippines|indonesia|bangladesh)/i.test(
            fullText
          )
        )
          region = 'Asia / HK / TW';
        else if (
          /(usa|united states|canada|mexico|washington|pentagon|white house|trump|congress|american|us economy|us military|haiti|cuba|guatemala|honduras|nicaragua|el salvador|costa rica|panama|dominican republic|puerto rico|jamaica|bahamas|north america)/i.test(
            fullText
          )
        )
          region = 'North America';
        else if (
          /(venezuela|brazil|colombia|argentina|chile|peru|ecuador|bolivia|guyana|paraguay|uruguay|suriname|maduro|lula|milei|south america)/i.test(
            fullText
          )
        )
          region = 'South America';
        else if (
          /(sudan|ethiopia|somalia|nigeria|mali|niger|burkina faso|congo|drc|goma|kenya|uganda|libya|chad|cameroon|\bafrica\b|al-shabaab|boko haram|rsf|mozambique|zimbabwe|senegal|ivory coast|côte d'ivoire|ghana|tanzania|rwanda|south africa)/i.test(
            fullText
          )
        )
          region = 'Africa';
        else region = region || 'Global';
      }

      // ----- FALLBACK: region-based center with small jitter -----
      const regionCenters: Record<string, { lat: number; lng: number }> = {
        'Middle East': { lat: 32.0, lng: 44.0 },
        'Europe / UKR': { lat: 50.0, lng: 20.0 },
        'Asia / HK / TW': { lat: 30.0, lng: 105.0 },
        'North America': { lat: 40.0, lng: -100.0 },
        'South America': { lat: -15.0, lng: -60.0 },
        Africa: { lat: 5.0, lng: 20.0 },
        Global: { lat: 20.0, lng: 10.0 },
      };
      const base = regionCenters[region] ?? regionCenters['Global'];
      let location = {
        lat: base.lat + (Math.random() * 4 - 2),
        lng: base.lng + (Math.random() * 4 - 2),
        name: region,
      };

      // ----- LOCATION MUST BE KNOWN — discard if no real location matched -----
      // If the feed has a predefined anchor (e.g. Al Jazeera → Middle East focus),
      // and the scraped location is weak (score < 4), fallback to the anchor.
      // This prevents a single mention of "US" in a Middle East article from plotting it in Washington.
      if (!bestLocationKey || bestScore < 4) {
        if (item.feedName && FEED_DEFAULT_LOCATION[item.feedName]) {
          const anchor = FEED_DEFAULT_LOCATION[item.feedName];
          location = {
            lat: anchor.lat + (Math.random() * 0.3 - 0.15),
            lng: anchor.lng + (Math.random() * 0.3 - 0.15),
            name: anchor.name,
          };
          // Override region classification if falling back to anchor
          if (anchor.name === 'Middle East') region = 'Middle East';
        } else {
          // No real location, no feed anchor — skip this article entirely.
          return null;
        }
      } else {
        const coords = LOCATIONS[bestLocationKey];
        location = {
          lat: coords.lat + (Math.random() * 0.12 - 0.06),
          lng: coords.lng + (Math.random() * 0.12 - 0.06),
          name: coords.name,
        };
      }

      let category = 'other';
      // ── PRIORITY ORDER: explosion → protest → politics → military → humanitarian ──
      // Explosion comes FIRST: airstrikes, drone/rocket/missile strikes, shelling etc.
      // are real detonation events — not just "military activity".
      if (
        /(explosion|blast|detonat|car bomb|\bied\b|suicide bomb|grenade attack|\bairstrike\b|\bairstrikes\b|drone strike|missile strike|rocket attack|rocket fire|shelling|bombardment|roadside bomb|bomb blast|bomb attack|bombed|\bbombing\b|mortar|\bshell\b|artillery fire|kamikaze drone|explosive device|rocket barrage|heavy shelling|warplanes strike|killed in strike|hit by strike)/i.test(
          fullText
        )
      )
        category = 'explosion';
      // Protest: expanded with tear gas, rallies, marches, civil disobedience
      else if (
        /(protest|riot|demonstration|mass march|civil unrest|uprising|revolt|rebellion|activist|picket|boycott|walkout|crackdown|barricade|clashes with police|demonstrators|\brally\b|rallied|marchers?|\bmarching\b|tear gas|pepper spray|water cannon|chanting|sit-in|civil disobedience|general strike|labor strike|student protest|anti-government|counter-protest)/i.test(
          fullText
        )
      )
        category = 'protest';
      // Politics: diplomacy, ceasefire, peace talks, summits, elections, sanctions
      else if (
        /(ceasefire|peace talks?|peace deal|peace agreement|peace negotiations?|diplomatic talks?|calls with|mediation|mediator|negotiat|accord|treaty|summit|election|diplomacy|senate|congress|minister|president|government|vote|parliament|policy|sanction|embargo|lawmaker|foreign policy|state department|white house|kremlin|foreign minister|national security|un security council|\bnato\b|g7|g20|trade war|tariff|imf|world bank|coup|regime change|coalition|alliance|envoy|ambassador|geopolit|sovereignty|territorial dispute|annexat|separatist|referendum|expel|ultimatum|withdrawal|bilateral|secretary of state|defense secretary|prime minister|chancellor|politburo|hostage deal|prisoner exchange|talks between|leaders of|bilateral meeting)/i.test(
          fullText
        )
      )
        category = 'politics';
      // Military: actual force operations, deployments, armed conflict — NOT diplomatic
      else if (
        /(\bmilitary\b|\barmy\b|\bnavy\b|air force|frontline|offensive|siege|blockade|troop|soldier|\bwarship\b|nuclear weapons?|ballistic missile|rebel group|militia|assassinat|sniper|\bidf\b|\birgc\b|nato forces|armed conflict|ground offensive|air raid|naval|air defence|air defense|war crime|genocide|armed forces|special forces|military operation|invasion|occupied territory|combat)/i.test(
          fullText
        )
      )
        category = 'military';
      else if (
        /(humanitarian aid|refugee camp|humanitarian crisis|earthquake|disaster relief|flood victims|hurricane|tsunami|evacuat|asylum seeker|starvation|famine|rescue operation|relief effort|displaced persons|displacement|food insecurity|water shortage|cholera|\bepidemic\b|pandemic|malnutrition|emergency shelter|internally displaced|\bidp\b|unhcr|red cross|world food programme|oxfam|unicef|msf|doctors without borders)/i.test(
          fullText
        )
      )
        category = 'humanitarian';

      if (category === 'other') return null;

      // Region already assigned above

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        category,
        region,
        timestamp: item.timestamp,
        location,
        sourceUrl: item.link,
        imageUrl: item.imageUrl,
      };
    })
    .filter(Boolean);
}

// ── STORY-LEVEL DEDUPLICATION ──────────────────────────────────────────────
// Groups co-located events of the same category within a 4-hour window.
// The first article (most recent after sort) survives; others are merged into
// its hotScore so the frontend can render a pulse proportional to interest.
function deduplicateByStory(events: any[]): any[] {
  const buckets = new Map<string, any[]>();
  for (const ev of events) {
    // Group by the exact location name assigned from the dictionary + category + 6hr window
    // This avoids jitter breaking the group
    const timeBucket = Math.floor(new Date(ev.timestamp).getTime() / (6 * 60 * 60 * 1000));
    const key = `${ev.location.name}:${ev.category}:${timeBucket}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(ev);
  }

  const deduped: any[] = [];
  for (const [, group] of buckets) {
    // Pick the most recently-published article as the representative
    group.sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const winner = {
      ...group[0],
      hotScore: group.length,
      // Store all stories from the group so the popup can list them
      relatedStories: group.map((g: any) => ({
        title: g.title,
        sourceUrl: g.sourceUrl,
        source: g.source || '',
        timestamp: g.timestamp,
      })),
    };
    deduped.push(winner);
  }
  return deduped;
}

// FIX: Background caching to prevent frontend timeouts
let globalNewsCache: any[] = [];
let isRefreshing = false;

async function refreshGlobalNews(fastMode = false) {
  if (!fastMode && isRefreshing) return;
  if (!fastMode) isRefreshing = true;
  const feedsToUse = fastMode ? FEEDS.filter((f) => FAST_FEED_NAMES.has(f.name)) : FEEDS;
  const modeLabel = fastMode ? 'FAST' : 'FULL';
  console.log(
    `[Background Crawler] Starting ${modeLabel} feed scan (${feedsToUse.length} feeds)...`
  );

  try {
    const results = await Promise.allSettled(
      feedsToUse.map(async (feed) => {
        try {
          // JSON Feed Parsing Logic (rss.app, custom dashboards)
          if (feed.url.endsWith('.json')) {
            const ctrl = new AbortController();
            setTimeout(() => ctrl.abort(), 6000); // 6s timeout for external JSON
            const res = await fetch(feed.url, { signal: ctrl.signal });
            if (!res.ok) return [];

            const data = (await res.json()) as any;
            const items = Array.isArray(data.items) ? data.items : [];

            return items
              .slice(0, 80)
              .map((item: any) => ({
                id: makeItemId(item, feed.name),
                title: (item.title || '').trim(),
                description: (item.content_text || item.summary || item.description || '').slice(
                  0,
                  500
                ),
                timestamp: item.date_published || new Date().toISOString(),
                source: feed.name,
                feedName: feed.name,
                region: feed.region,
                link: item.url || item.link || '',
                imageUrl: item.image || item.image_url || null,
              }))
              .filter((i: any) => i.title);
          }
          // Standard XML RSS Parsing Logic
          else {
            const parsed = await parser.parseURL(feed.url);
            return parsed.items
              .slice(0, 80)
              .map((item) => ({
                id: makeItemId(item, feed.name),
                title: (item.title || '').trim(),
                description: (item.contentSnippet || item.content || item.summary || '').slice(
                  0,
                  500
                ),
                timestamp: item.pubDate
                  ? new Date(item.pubDate).toISOString()
                  : new Date().toISOString(),
                source: feed.name,
                feedName: feed.name,
                region: feed.region,
                link: item.link || '',
                imageUrl:
                  item['media:content']?.['$']?.url ||
                  item.enclosure?.url ||
                  item['media:thumbnail']?.['$']?.url ||
                  item.image ||
                  null,
              }))
              .filter((i) => i.title);
          }
        } catch (e) {
          // Fail gracefully for single-feed unreachability
          return [];
        }
      })
    );

    let allItems = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<any[]>).value);

    // GDELT DOC
    try {
      const gdeltCtrl = new AbortController();
      setTimeout(() => gdeltCtrl.abort(), 8000);
      const gdeltRes = await fetch(
        'https://api.gdeltproject.org/api/v2/doc/doc?query=(conflict OR protest OR disaster OR military OR ceasefire OR violence OR attack OR explosion OR unrest)&mode=ArtList&format=json&maxrecords=250',
        { signal: gdeltCtrl.signal }
      );
      if (gdeltRes.ok) {
        const gData = (await gdeltRes.json()) as any;
        const gdeltItems = (gData.articles || [])
          .map((art: any) => ({
            id: makeItemId({ link: art.url, title: art.title }, 'GDELT'),
            title: (art.title || '').trim(),
            description: `Captured from GDELT full-text search. Source domain: ${art.domain || 'Unknown'}`,
            timestamp: parseGdeltDate(art.seendate),
            source: art.domain || 'GDELT',
            link: art.url || '',
            imageUrl: art.socialimage || art.imageurl || null,
          }))
          .filter((i: any) => i.title);
        allItems = [...allItems, ...gdeltItems];
      }
    } catch (e) { }

    // NewsAPI
    try {
      const naKey = process.env.NEWSAPI_KEY || '';
      if (naKey) {
        const naController = new AbortController();
        setTimeout(() => naController.abort(), 8000);
        const newsApiRes = await fetch(
          `https://newsapi.org/v2/everything?q=("Middle East" OR Europe OR Israel OR Gaza OR Ukraine OR Russia OR Iran) AND (military OR war OR conflict OR protest OR explosion)&sortBy=publishedAt&pageSize=100&apiKey=${naKey}`,
          { signal: naController.signal }
        );
        if (newsApiRes.ok) {
          const nData = (await newsApiRes.json()) as any;
          const nItems = (nData.articles || [])
            .map((art: any) => ({
              id: makeItemId({ link: art.url, title: art.title }, 'NewsAPI'),
              title: (art.title || '').trim(),
              description: (art.description || art.content || 'Top headline from NewsAPI').slice(
                0,
                500
              ),
              timestamp: art.publishedAt
                ? new Date(art.publishedAt).toISOString()
                : new Date().toISOString(),
              source: art.source?.name || 'NewsAPI',
              link: art.url || '',
              imageUrl: art.urlToImage || null,
            }))
            .filter((i: any) => i.title);
          allItems = [...allItems, ...nItems];
        }
      }
    } catch (e) { }

    // Dual-key dedup: URL id + title fingerprint
    const seen = new Set<string>();
    const seenTitles = new Set<string>();

    // Heuristic: filter out items whose titles are almost entirely non-Latin (Cyrillic, Arabic, Asian scripts)
    // to keep the main feed mostly English/Latin-based.
    const isMostlyLatin = (str: string) => {
      const latinMatches = str.match(/[a-zA-Z]/g);
      const totalChars = str.replace(/\s+/g, '').length;
      if (totalChars === 0) return true;
      return (latinMatches ? latinMatches.length : 0) / totalChars > 0.4;
    };

    const unique = allItems.filter((i) => {
      if (seen.has(i.id)) return false;
      if (!isMostlyLatin(i.title)) return false;
      seen.add(i.id);
      const th = titleHash(i.title);
      if (seenTitles.has(th)) return false;
      seenTitles.add(th);
      return true;
    });

    const processed = processItems(unique).filter((i) => i !== null);

    // Story-level dedup: merge co-located same-category events into one with hotScore
    const deduped = deduplicateByStory(processed);

    // Cap at 200 events per region to keep the feed focused and fast
    const REGION_CAP = 150;
    const regionCounts: Record<string, number> = {};
    const cappedAndSorted = deduped
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((e) => {
        const r = e.region || 'Global';
        regionCounts[r] = (regionCounts[r] || 0) + 1;
        return regionCounts[r] <= REGION_CAP;
      });

    globalNewsCache = cappedAndSorted;

    // --- Persistence: Push to Supabase ---
    if (supabaseUrl && supabaseKey) {
      try {
        const supabaseRows = cappedAndSorted.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          category: e.category,
          timestamp: e.timestamp,
          lat: e.location.lat,
          lng: e.location.lng,
          location_name: e.location.name,
          region: e.region,
          source_url: e.sourceUrl,
          image_url: e.imageUrl,
          status: 'published',
        }));

        // Upsert in batches of 50 to avoid payload limits
        for (let i = 0; i < supabaseRows.length; i += 50) {
          const batch = supabaseRows.slice(i, i + 50);
          const { error } = await supabase.from('events').upsert(batch, { onConflict: 'id' });
          if (error) console.error(`[Supabase Sync] Batch ${i / 50} error:`, error.message);
        }
        console.log(`[Supabase Sync] Successfully synchronized ${supabaseRows.length} items.`);
      } catch (syncErr: any) {
        console.error('[Supabase Sync] Fatal error:', syncErr.message);
      }
    }

    const summary = Object.entries(regionCounts)
      .map(([r, c]) => `${r}:${Math.min(c, REGION_CAP)}`)
      .join(', ');
    console.log(
      `[Background Crawler] Success. Cached ${globalNewsCache.length} events. [${summary}]`
    );
  } catch (err) {
    console.error('[Background Crawler] Fatal error:', err);
  } finally {
    isRefreshing = false;
  }
}

const NEWS_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const FAST_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes
let lastGlobalNewsRefresh = 0;
let lastFastNewsRefresh = 0;
let fastNewsCache: any[] = [];

// Start crawler - Skip intervals on Vercel to prevent hanging
if (!process.env.VERCEL) {
  // SPEED OPTIMIZATION:
  // 1. Run fast feed immediately on startup (~30 reliable feeds, done in 3-5s)
  // 2. Then trigger full deep scan in background (can take 30-60s)
  // This means the first /api/news request gets data in ~3-5s instead of 30-60s.
  refreshGlobalNews(true).then(() => {
    console.log('[Startup] Fast cache ready. Triggering full background scan...');
    refreshGlobalNews(false); // full scan, don't await
  });

  // Periodic refresh: fast every 3 min, full every 5 min
  setInterval(() => refreshGlobalNews(true), FAST_REFRESH_INTERVAL);
  setInterval(() => refreshGlobalNews(false), NEWS_REFRESH_INTERVAL);
} else {
  // Initial empty state or first-hit logic handled in route
  console.log('[Vercel] Running in serverless mode. Timers disabled.');
}

// Rate limit: 60 req/min to /api/news
const rateLimitCounts = new Map<string, { count: number; window: number }>();
function rateLimit(req: any, res: any, next: any) {
  const ip = req.ip || 'unknown';
  const now = Math.floor(Date.now() / 60000);
  const entry = rateLimitCounts.get(ip);
  if (!entry || entry.window !== now) {
    rateLimitCounts.set(ip, { count: 1, window: now });
    return next();
  }
  entry.count++;
  if (entry.count > 60) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

app.get('/api/news', rateLimit, async (req: any, res: any) => {
  const isFast = req.query.fast === '1';

  if (process.env.VERCEL) {
    if (isFast) {
      // Fast mode: refresh only if stale (3 min interval)
      if (Date.now() - lastFastNewsRefresh > FAST_REFRESH_INTERVAL || fastNewsCache.length === 0) {
        console.log('[Vercel] Fast mode: refreshing from reliable feeds only...');
        lastFastNewsRefresh = Date.now();
        await refreshGlobalNews(true);
        fastNewsCache = globalNewsCache;
        // Trigger full crawl in background (don't await)
        if (Date.now() - lastGlobalNewsRefresh > NEWS_REFRESH_INTERVAL) {
          lastGlobalNewsRefresh = Date.now();
          refreshGlobalNews(false)
            .then(() => {
              console.log('[Vercel] Background full crawl complete.');
            })
            .catch(() => { });
        }
      }
      return res.json(fastNewsCache.length ? fastNewsCache : globalNewsCache);
    } else {
      // Full mode
      if (
        Date.now() - lastGlobalNewsRefresh > NEWS_REFRESH_INTERVAL ||
        globalNewsCache.length === 0
      ) {
        console.log('[Vercel] Full mode: triggering deep feed scan...');
        lastGlobalNewsRefresh = Date.now();
        await refreshGlobalNews(false);
      }
    }
  }

  res.json(globalNewsCache);
});

// ── HISTORICAL ARCHIVE ENDPOINT ───────────────────────────────────────────────────
// GET /api/historical?from=2024-10-07&to=2024-10-14&q=war  (max 30 days)
// Uses NewsAPI /everything which supports from/to date filtering.
app.get('/api/historical', rateLimit, async (req: any, res: any) => {
  const { from, to, q } = req.query as { from?: string; to?: string; q?: string };

  if (!from || !to) return res.status(400).json({ error: 'Missing params: from, to (YYYY-MM-DD)' });

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
    return res.status(400).json({ error: 'Invalid date format — use YYYY-MM-DD.' });

  const diffDays = (toDate.getTime() - fromDate.getTime()) / 86_400_000;
  if (diffDays < 0) return res.status(400).json({ error: '"from" must be before "to".' });
  if (diffDays > 30) return res.status(400).json({ error: 'Max range is 30 days.' });

  const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
  if (!NEWSAPI_KEY) {
    // Fallback: If no NewsAPI key, return empty or a message instead of 503
    return res.json({
      articles: [],
      message: 'Archive requires NEWSAPI_KEY. Using live feeds only.',
    });
  }

  const keyword =
    q?.trim() ||
    '("Middle East" OR Europe OR Israel OR Gaza OR Ukraine OR Russia) AND (war OR conflict OR attack OR military OR protest OR explosion OR ceasefire OR coup OR crisis)';

  const toEOD = new Date(toDate);
  toEOD.setHours(23, 59, 59);

  const params = new URLSearchParams({
    q: keyword,
    from: fromDate.toISOString().split('T')[0],
    to: toEOD.toISOString().split('T')[0],
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: '100',
    apiKey: NEWSAPI_KEY,
  });

  const url = `https://newsapi.org/v2/everything?${params}`;

  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20000);
    const apiRes = await fetch(url, { signal: ctrl.signal });
    const data = (await apiRes.json()) as any;

    if (!apiRes.ok || data.status === 'error') {
      const msg = data?.message || `HTTP ${apiRes.status}`;
      console.error('[Archive] NewsAPI error:', msg);
      return res.status(502).json({ error: `NewsAPI: ${msg}` });
    }

    const articles: any[] = data.articles || [];
    const rawItems = articles
      .filter((a: any) => a.title && a.title !== '[Removed]')
      .map((a: any) => ({
        id: makeItemId({ link: a.url, title: a.title }, 'NEWSAPI-HIST'),
        title: (a.title || '').trim(),
        description: a.description || a.content || `Source: ${a.source?.name || 'NewsAPI'}`,
        timestamp: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
        source: a.source?.name || 'NewsAPI Archive',
        feedName: 'NEWSAPI-HIST',
        link: a.url || '',
        imageUrl: a.urlToImage || null,
      }));

    const processed = processItems(rawItems);
    console.log(`[Archive] ${from} → ${to}: ${processed.length} events from NewsAPI`);
    res.json(processed);
  } catch (err: any) {
    if (err.name === 'AbortError')
      return res.status(504).json({ error: 'Archive query timed out. Try again.' });
    console.error('[Archive] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch historical data.' });
  }
});

// ── LIVE MILITARY AIRCRAFT TRACKING ──────────────────────────────────────────
let liveAircraftCache: any[] = [];
let liveShipsCache: any[] = [];
let isFetchingAircraft = false;

// ICAO 24-bit address prefixes for country origin determination
function getCountryFromHex(hex: string): string {
  if (!hex) return 'Unknown';
  hex = hex.toUpperCase();
  if (hex.startsWith('A') && hex <= 'AFFFFF') return 'United States';
  if (hex >= '3E0000' && hex <= '3FFFFF') return 'Germany';
  if (hex >= '400000' && hex <= '43FFFF') return 'United Kingdom';
  if (hex >= '440000' && hex <= '447FFF') return 'Austria';
  if (hex >= '480000' && hex <= '48FFFF') return 'Netherlands';
  if (hex >= '4A0000' && hex <= '4AFFFF') return 'Switzerland';
  if (hex >= '4C0000' && hex <= '4CFFFF') return 'Sweden';
  if (hex >= '500000' && hex <= '50FFFF') return 'Italy';
  if (hex >= '380000' && hex <= '3BFFFF') return 'France';
  if (hex >= '7C0000' && hex <= '7CFFFF') return 'Australia';
  if (hex >= 'C00000' && hex <= 'C3FFFF') return 'Canada';
  if (hex >= '140000' && hex <= '15FFFF') return 'Russia';
  if (hex >= '7A0000' && hex <= '7AFFFF') return 'China';
  if (hex >= '060000' && hex <= '06FFFF') return 'Qatar';
  if (hex >= '730000' && hex <= '73FFFF') return 'Israel';
  if (hex >= '010000' && hex <= '01FFFF') return 'Egypt';
  if (hex >= '0B0000' && hex <= '0BFFFF') return 'Saudi Arabia';
  if (hex >= '4B0000' && hex <= '4BFFFF') return 'Turkey';
  if (hex >= '700000' && hex <= '70FFFF') return 'Afghanistan';
  return ''; // Returns empty block if unknown, falls back to operator
}

// OSINT Derived Naval Assets (Since live military AIS is encrypted/dark)
const INITIAL_SHIPS = [
  {
    id: 'csg-1',
    name: 'USS Dwight D. Eisenhower (CVN-69)',
    type: 'Carrier Strike Group',
    country: 'United States',
    lat: 21.0,
    lng: 38.5,
    heading: 320,
    speed: 15,
  }, // Red Sea
  {
    id: 'csg-2',
    name: 'USS Theodore Roosevelt (CVN-71)',
    type: 'Carrier Strike Group',
    country: 'United States',
    lat: 18.2,
    lng: 114.5,
    heading: 45,
    speed: 12,
  }, // South China Sea
  {
    id: 'hms-1',
    name: 'HMS Queen Elizabeth (R08)',
    type: 'Carrier Strike Group',
    country: 'United Kingdom',
    lat: 55.0,
    lng: -0.5,
    heading: 180,
    speed: 18,
  }, // North Sea
  {
    id: 'cdg-1',
    name: 'FS Charles de Gaulle (R91)',
    type: 'Carrier Strike Group',
    country: 'France',
    lat: 34.5,
    lng: 18.0,
    heading: 90,
    speed: 14,
  }, // Mediterranean
  {
    id: 'lhd-1',
    name: 'USS Bataan (LHD-5)',
    type: 'Amphibious Ready Group',
    country: 'United States',
    lat: 33.5,
    lng: 34.0,
    heading: 270,
    speed: 10,
  }, // East Med
  {
    id: 'plan-1',
    name: 'Shandong (CV-17)',
    type: 'Aircraft Carrier',
    country: 'China',
    lat: 22.5,
    lng: 121.0,
    heading: 10,
    speed: 16,
  }, // Taiwan Strait
  {
    id: 'vmf-1',
    name: 'Admiral Gorshkov',
    type: 'Guided Missile Frigate',
    country: 'Russia',
    lat: 70.0,
    lng: 33.5,
    heading: 200,
    speed: 11,
  }, // Barents
];

async function refreshMilitaryAircraft() {
  if (isFetchingAircraft) return;
  isFetchingAircraft = true;

  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000); // 10s timeout
    // Using ADSB.one proxy. Pre-filtered for mil/gov globally.
    const res = await fetch('https://api.adsb.one/v2/mil', {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'PulseMap-Tracker/1.0',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as any;
    if (data && data.ac) {
      const mapped = data.ac
        .filter((a: any) => a.lat && a.lon) // Must have coordinates
        .map((a: any) => ({
          id: a.hex,
          callsign: (a.flight || '').trim() || 'N/A',
          type: a.t || 'MIL',
          description: a.desc || 'Military Aircraft',
          lat: a.lat,
          lng: a.lon,
          alt: a.alt_baro || a.alt_geom || 0, // Feet
          speed: a.gs || 0, // Knots
          heading: a.track || 0,
          registration: a.r || '',
          operator: a.ownOp || getCountryFromHex(a.hex),
        }));
      liveAircraftCache = mapped;

      // Update mocked ships with slight drift to make them look "live"
      if (liveShipsCache.length === 0) {
        liveShipsCache = JSON.parse(JSON.stringify(INITIAL_SHIPS));
      } else {
        liveShipsCache = liveShipsCache.map((ship) => {
          // Add tiny random drift based on heading and speed
          const speedFactor = ship.speed * 0.00001;
          const rad = (ship.heading * Math.PI) / 180;
          return {
            ...ship,
            lat: ship.lat + Math.cos(rad) * speedFactor * (Math.random() * 0.5 + 0.5),
            lng: ship.lng + Math.sin(rad) * speedFactor * (Math.random() * 0.5 + 0.5),
            heading: ship.heading + (Math.random() * 10 - 5), // Slight turn
          };
        });
      }

      console.log(
        `[Aircraft Crawler] Updated ${mapped.length} live military aircraft & ${liveShipsCache.length} ships.`
      );
    }
  } catch (err: any) {
    // Only log the message, not the full stack to avoid spam
    console.error(`[Aircraft Crawler] Error: ${err.message}`);
  } finally {
    isFetchingAircraft = false;
  }
}

const AIRCRAFT_REFRESH_INTERVAL = 15 * 1000;
let lastAircraftRefresh = 0;

// Start polling every 15 seconds to keep the map smooth
if (!process.env.VERCEL) {
  refreshMilitaryAircraft();
  setInterval(refreshMilitaryAircraft, AIRCRAFT_REFRESH_INTERVAL);
}

app.get('/api/aircraft', rateLimit, async (req: any, res: any) => {
  // On-demand refresh for Serverless environments (Vercel)
  if (process.env.VERCEL && Date.now() - lastAircraftRefresh > AIRCRAFT_REFRESH_INTERVAL) {
    console.log('[Vercel] Triggering on-demand aircraft refresh...');
    lastAircraftRefresh = Date.now();
    await refreshMilitaryAircraft();
  }
  res.json({
    aircraft: liveAircraftCache,
    ships: liveShipsCache,
  });
});

// --- STRATEGIC ASSETS DATABASE ---
const STRATEGIC_ASSETS: any[] = [
  {
    id: 'nuc-pantex',
    name: 'Pantex Plant',
    type: 'nuclear',
    lat: 35.3125,
    lng: -101.5658,
    description: 'Primary US facility for nuclear weapons assembly/disassembly.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Pantex',
  },
  {
    id: 'nuc-losalamos',
    name: 'Los Alamos National Laboratory',
    type: 'nuclear',
    lat: 35.875,
    lng: -106.3242,
    description: 'Birthplace of the atomic bomb, key US nuclear research facility.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Los_Alamos_National_Laboratory',
  },
  {
    id: 'nuc-sandia',
    name: 'Sandia National Laboratories',
    type: 'nuclear',
    lat: 35.0478,
    lng: -106.5442,
    description: 'Major US nuclear weapon research and development lab.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sandia_National_Laboratories',
  },
  {
    id: 'nuc-oakridge',
    name: 'Y-12 National Security Complex',
    type: 'nuclear',
    lat: 35.9868,
    lng: -84.2625,
    description: 'US facility for manufacturing nuclear weapon components.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Y-12_National_Security_Complex',
  },
  {
    id: 'nuc-kurchatov',
    name: 'Kurchatov Institute',
    type: 'nuclear',
    lat: 55.7981,
    lng: 37.4728,
    description: "Russia's primary research and development institution for nuclear energy.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Kurchatov_Institute',
  },
  {
    id: 'nuc-sarov',
    name: 'VNIIEF (Sarov)',
    type: 'nuclear',
    lat: 54.9333,
    lng: 43.3167,
    description: 'Major Russian nuclear weapons design center (formerly Arzamas-16).',
    wikiUrl:
      'https://en.wikipedia.org/wiki/All-Russian_Scientific_Research_Institute_of_Experimental_Physics',
  },
  {
    id: 'nuc-seversk',
    name: 'Siberian Group of Chemical Enterprises',
    type: 'nuclear',
    lat: 56.6,
    lng: 84.8833,
    description: 'Russian nuclear materials production facility in Seversk.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Siberian_Chemical_Combine',
  },
  {
    id: 'nuc-novaya_zemlya',
    name: 'Novaya Zemlya Test Site',
    type: 'nuclear',
    lat: 73,
    lng: 54,
    description: 'Historic Soviet/Russian nuclear test site in the Arctic.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Novaya_Zemlya_Test_Site',
  },
  {
    id: 'nuc-les-valduc',
    name: 'CEA Valduc',
    type: 'nuclear',
    lat: 47.584,
    lng: 4.869,
    description: 'French nuclear weapons research and production center.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Valduc_nuclear_center',
  },
  {
    id: 'nuc-awre',
    name: 'AWE Aldermaston',
    type: 'nuclear',
    lat: 51.365,
    lng: -1.144,
    description: 'UK facility responsible for design and manufacture of nuclear warheads.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Atomic_Weapons_Establishment',
  },
  {
    id: 'nuc-bhabha',
    name: 'Bhabha Atomic Research Centre',
    type: 'nuclear',
    lat: 19.006,
    lng: 72.918,
    description: "India's premier nuclear research facility.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Bhabha_Atomic_Research_Centre',
  },
  {
    id: 'nuc-kahuta',
    name: 'Kahuta Research Laboratories',
    type: 'nuclear',
    lat: 33.5936,
    lng: 73.3853,
    description: "Pakistan's main uranium enrichment facility.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Khan_Research_Laboratories',
  },
  {
    id: 'nuc-reactor-yongbyon',
    name: 'Yongbyon Nuclear Scientific Research Center',
    type: 'nuclear',
    lat: 39.795,
    lng: 125.755,
    description: "North Korea's major nuclear facility.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Yongbyon_Nuclear_Scientific_Research_Center',
  },
  {
    id: 'mil-diego-garcia',
    name: 'Naval Support Facility Diego Garcia',
    type: 'military',
    lat: -7.3133,
    lng: 72.4111,
    description: 'Highly strategic joint US/UK logistics and bomber base in the Indian Ocean.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Naval_Support_Facility_Diego_Garcia',
  },
  {
    id: 'mil-andersen',
    name: 'Andersen Air Force Base',
    type: 'military',
    lat: 13.5841,
    lng: 144.9244,
    description: 'Critical US strategic bomber base in Guam, Pacific projection.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Andersen_Air_Force_Base',
  },
  {
    id: 'mil-kadena',
    name: 'Kadena Air Base',
    type: 'military',
    lat: 26.3556,
    lng: 127.7675,
    description: 'Largest US combat wing base in Japan/Pacific.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Kadena_Air_Base',
  },
  {
    id: 'mil-guantanamo',
    name: 'Guantanamo Bay Naval Base',
    type: 'military',
    lat: 19.9077,
    lng: -75.0969,
    description: 'US naval base on the island of Cuba.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Guantanamo_Bay_Naval_Base',
  },
  {
    id: 'mil-incirlik',
    name: 'Incirlik Air Base',
    type: 'military',
    lat: 37.0019,
    lng: 35.4258,
    description: 'Strategic US/NATO air base in Turkey, stores tactical nukes.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Incirlik_Air_Base',
  },
  {
    id: 'mil-rota',
    name: 'Naval Station Rota',
    type: 'military',
    lat: 36.6453,
    lng: -6.3458,
    description: 'Major US/Spanish naval base projecting into Mediterranean and Atlantic.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Naval_Station_Rota',
  },
  {
    id: 'mil-souda-bay',
    name: 'Naval Support Activity Souda Bay',
    type: 'military',
    lat: 35.4952,
    lng: 24.1481,
    description: 'Key US/NATO logistics and air base in Crete, Greece.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Naval_Support_Activity_Souda_Bay',
  },
  {
    id: 'mil-ramstein',
    name: 'Ramstein Air Base',
    type: 'military',
    lat: 49.4358,
    lng: 7.5991,
    description: 'Headquarters for US Air Forces in Europe and NATO Allied Air Command.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Ramstein_Air_Base',
  },
  {
    id: 'mil-aviano',
    name: 'Aviano Air Base',
    type: 'military',
    lat: 46.0319,
    lng: 12.5967,
    description: 'US Air Force/NATO base in Italy, suspected nuclear storage.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Aviano_Air_Base',
  },
  {
    id: 'mil-sigonella',
    name: 'Naval Air Station Sigonella',
    type: 'military',
    lat: 37.4017,
    lng: 14.9222,
    description: 'Strategic US/NATO logistical hub in Sicily, Italy.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Naval_Air_Station_Sigonella',
  },
  {
    id: 'mil-camp-lemonnier',
    name: 'Camp Lemonnier',
    type: 'military',
    lat: 11.5433,
    lng: 43.1492,
    description: 'Primary US base in Africa (Djibouti), critical for Red Sea operations.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Camp_Lemonnier',
  },
  {
    id: 'mil-al-udeid',
    name: 'Al Udeid Air Base',
    type: 'military',
    lat: 25.1167,
    lng: 51.3167,
    description: 'Largest US military base in the Middle East (Qatar).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Al_Udeid_Air_Base',
  },
  {
    id: 'mil-prince-sultan',
    name: 'Prince Sultan Air Base',
    type: 'military',
    lat: 24.0617,
    lng: 47.5381,
    description: 'Major Saudi/US air base south of Riyadh.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Prince_Sultan_Air_Base',
  },
  {
    id: 'mil-camp-humphreys',
    name: 'Camp Humphreys',
    type: 'military',
    lat: 36.9667,
    lng: 127.0333,
    description: 'Largest US overseas military base, located in South Korea.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Camp_Humphreys',
  },
  {
    id: 'mil-hickam',
    name: 'Joint Base Pearl Harbor-Hickam',
    type: 'military',
    lat: 21.3486,
    lng: -157.9486,
    description: 'Headquarters of US Pacific Fleet and Pacific Air Forces.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Joint_Base_Pearl_Harbor-Hickam',
  },
  {
    id: 'mil-subic-bay',
    name: 'Subic Bay Naval Base',
    type: 'military',
    lat: 14.7936,
    lng: 120.2861,
    description:
      'Historic US naval base in Philippines, increasingly relevant for South China Sea.',
    wikiUrl: 'https://en.wikipedia.org/wiki/U.S._Naval_Base_Subic_Bay',
  },
  {
    id: 'mil-clark-ab',
    name: 'Clark Air Base',
    type: 'military',
    lat: 15.1833,
    lng: 120.55,
    description: 'Key Philippine air base utilized by US forces.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Clark_Air_Base',
  },
  {
    id: 'mil-thule',
    name: 'Pituffik Space Base (Thule)',
    type: 'military',
    lat: 76.5312,
    lng: -68.7032,
    description: 'Northernmost US military installation, vital for early missile warning.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Pituffik_Space_Base',
  },
  {
    id: 'mil-pine-gap',
    name: 'Pine Gap',
    type: 'military',
    lat: -23.7994,
    lng: 133.7372,
    description: 'Secretive US/Australian satellite tracking and signals intelligence station.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Pine_Gap',
  },
  {
    id: 'mil-misawa',
    name: 'Misawa Air Base',
    type: 'military',
    lat: 40.7042,
    lng: 141.3686,
    description: 'Joint US/Japan air base, key SIGINT interception site.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Misawa_Air_Base',
  },
  {
    id: 'mil-bagram',
    name: 'Bagram Airfield',
    type: 'military',
    lat: 34.9458,
    lng: 69.2589,
    description: 'Former largest US military base in Afghanistan, now under Taliban control.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Bagram_Airfield',
  },
  {
    id: 'mil-tartus',
    name: 'Tartus Naval Base',
    type: 'military',
    lat: 34.9083,
    lng: 35.875,
    description: "Russia's only naval facility in the Mediterranean (Syria).",
    wikiUrl: 'https://en.wikipedia.org/wiki/Russian_naval_facility_in_Tartus',
  },
  {
    id: 'mil-khmeimim',
    name: 'Khmeimim Air Base',
    type: 'military',
    lat: 35.4111,
    lng: 35.9486,
    description: "Russia's primary air base operating in Syria.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Khmeimim_Air_Base',
  },
  {
    id: 'mil-sevastopol',
    name: 'Sevastopol Naval Base',
    type: 'military',
    lat: 44.6167,
    lng: 33.5333,
    description: 'Historic headquarters of the Russian Black Sea Fleet (occupied Crimea).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Sevastopol_Naval_Base',
  },
  {
    id: 'mil-kaliningrad',
    name: 'Kaliningrad Baltic Fleet Base',
    type: 'military',
    lat: 54.7167,
    lng: 20.5,
    description: 'Heavily militarized Russian exclave and Baltic Fleet HQ.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Baltic_Fleet',
  },
  {
    id: 'mil-vladivostok',
    name: 'Vladivostok Naval Base',
    type: 'military',
    lat: 43.115,
    lng: 131.8856,
    description: 'Headquarters of the Russian Pacific Fleet.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Pacific_Fleet_(Russia)',
  },
  {
    id: 'mil-polyarny',
    name: 'Polyarny Naval Base',
    type: 'military',
    lat: 69.1981,
    lng: 33.4561,
    description: 'Major Russian Northern Fleet nuclear submarine base.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Polyarny_Naval_Base',
  },
  {
    id: 'mil-jianggezhuang',
    name: 'Jianggezhuang Naval Base',
    type: 'military',
    lat: 36.1044,
    lng: 120.5786,
    description: 'Chinese Northern Theater Command nuclear submarine base.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Jianggezhuang_Naval_Base',
  },
  {
    id: 'mil-zhanjiang',
    name: 'Zhanjiang Naval Base',
    type: 'military',
    lat: 21.2,
    lng: 110.4,
    description: 'Headquarters of the Chinese South Sea Fleet.',
    wikiUrl: 'https://en.wikipedia.org/wiki/South_Sea_Fleet',
  },
  {
    id: 'mil-fiery-cross',
    name: 'Fiery Cross Reef',
    type: 'military',
    lat: 9.55,
    lng: 112.8833,
    description: 'Militarized artificial island built by China in the Spratlys.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Fiery_Cross_Reef',
  },
  {
    id: 'mil-mischief-reef',
    name: 'Mischief Reef',
    type: 'military',
    lat: 9.9167,
    lng: 115.5333,
    description: 'Militarized Chinese artificial island featuring a large airstrip.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Mischief_Reef',
  },
  {
    id: 'mil-subi-reef',
    name: 'Subi Reef',
    type: 'military',
    lat: 10.9167,
    lng: 114.0833,
    description: 'Chinese artificial island and military outpost in the South China Sea.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Subi_Reef',
  },
  {
    id: 'mil-woodhead',
    name: 'Faslane (HMNB Clyde)',
    type: 'military',
    lat: 56.0647,
    lng: -4.8153,
    description: 'Home of the UK Vanguard-class nuclear submarine fleet.',
    wikiUrl: 'https://en.wikipedia.org/wiki/HMNB_Clyde',
  },
  {
    id: 'mil-toulon',
    name: 'Toulon Arsenal',
    type: 'military',
    lat: 43.1119,
    lng: 5.9081,
    description:
      'Primary base for the French Navy (Marine Nationale) and Charles de Gaulle aircraft carrier.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Toulon_arsenal',
  },
  {
    id: 'mil-ile-longue',
    name: 'Île Longue',
    type: 'military',
    lat: 48.305,
    lng: -4.51,
    description: 'Base for French nuclear ballistic missile submarines.',
    wikiUrl: 'https://en.wikipedia.org/wiki/%C3%8Ele_Longue',
  },
  {
    id: 'mil-karwar',
    name: 'INS Kadamba (Karwar)',
    type: 'military',
    lat: 14.7578,
    lng: 74.1311,
    description: 'Major Indian naval base, highly strategic for the Indian Ocean.',
    wikiUrl: 'https://en.wikipedia.org/wiki/INS_Kadamba',
  },
  {
    id: 'mil-gwadar',
    name: 'Gwadar Port',
    type: 'military',
    lat: 25.0933,
    lng: 62.3361,
    description: 'Strategic Pakistani port developed heavily with Chinese investment.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Gwadar_Port',
  },
  {
    id: 'mil-chabahar',
    name: 'Chabahar Port',
    type: 'military',
    lat: 25.2925,
    lng: 60.6278,
    description: 'Strategic Iranian port developed with Indian assistance.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Chabahar_Port',
  },
  {
    id: 'mil-haifa',
    name: 'Haifa Naval Base',
    type: 'military',
    lat: 32.8272,
    lng: 34.9953,
    description: 'Primary base for the Israeli Navy, including Dolphin-class submarines.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Haifa_naval_base',
  },
  {
    id: 'mil-nevada-test',
    name: 'Nevada Test and Training Range (Area 51)',
    type: 'military',
    lat: 37.235,
    lng: -115.8111,
    description: 'Highly classified US Air Force flight testing facility.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Area_51',
  },
  {
    id: 'mil-cheyenne',
    name: 'Cheyenne Mountain Complex',
    type: 'military',
    lat: 38.7431,
    lng: -104.8483,
    description: 'Bunker complex, former home of US NORAD operations.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Cheyenne_Mountain_Complex',
  },
  {
    id: 'mil-guam-apra',
    name: 'Naval Base Guam (Apra Harbor)',
    type: 'military',
    lat: 13.4386,
    lng: 144.6547,
    description: 'Strategic US nuclear submarine forward operating base in the Pacific.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Naval_Base_Guam',
  },
  {
    id: 'mil-cam-ranh',
    name: 'Cam Ranh Base',
    type: 'military',
    lat: 11.905,
    lng: 109.215,
    description: 'Highly strategic deep-water port in Vietnam, historic projection node.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Cam_Ranh_Base',
  },
  {
    id: 'space-ksc',
    name: 'Kennedy Space Center',
    type: 'space',
    lat: 28.5728,
    lng: -80.6489,
    description: 'Primary US space launch facility.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Kennedy_Space_Center',
  },
  {
    id: 'space-vandenberg',
    name: 'Vandenberg Space Force Base',
    type: 'space',
    lat: 34.742,
    lng: -120.5724,
    description: 'Primary US West Coast polar launch and ICBM testing facility.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Vandenberg_Space_Force_Base',
  },
  {
    id: 'space-baikonur',
    name: 'Baikonur Cosmodrome',
    type: 'space',
    lat: 45.9646,
    lng: 63.3052,
    description:
      "Leased by Russia, the world's first and largest operational space launch facility.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Baikonur_Cosmodrome',
  },
  {
    id: 'space-plesetsk',
    name: 'Plesetsk Cosmodrome',
    type: 'space',
    lat: 62.9275,
    lng: 40.5739,
    description: 'Russian military spaceport for high-inclination orbits.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Plesetsk_Cosmodrome',
  },
  {
    id: 'space-vostochny',
    name: 'Vostochny Cosmodrome',
    type: 'space',
    lat: 51.8844,
    lng: 128.3342,
    description: 'New Russian civilian spaceport designed to reduce reliance on Baikonur.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Vostochny_Cosmodrome',
  },
  {
    id: 'space-jiuquan',
    name: 'Jiuquan Satellite Launch Center',
    type: 'space',
    lat: 40.9606,
    lng: 100.2983,
    description: "China's oldest spaceport, handles crewed missions.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Jiuquan_Satellite_Launch_Center',
  },
  {
    id: 'space-xichang',
    name: 'Xichang Satellite Launch Center',
    type: 'space',
    lat: 28.2461,
    lng: 102.0267,
    description: 'Major Chinese launch facility, known for geosynchronous missions.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Xichang_Satellite_Launch_Center',
  },
  {
    id: 'space-wenchang',
    name: 'Wenchang Spacecraft Launch Site',
    type: 'space',
    lat: 19.6144,
    lng: 110.9511,
    description: "China's newest launch site, handles heavy-lift rockets.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Wenchang_Spacecraft_Launch_Site',
  },
  {
    id: 'space-kourou',
    name: 'Guiana Space Centre (Kourou)',
    type: 'space',
    lat: 5.2393,
    lng: -52.7681,
    description: 'European Space Agency (ESA) primary equatorial launch site.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Guiana_Space_Centre',
  },
  {
    id: 'space-satish-dhawan',
    name: 'Satish Dhawan Space Centre',
    type: 'space',
    lat: 13.7198,
    lng: 80.2301,
    description: "India's primary orbital launch site.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Satish_Dhawan_Space_Centre',
  },
  {
    id: 'cyber-fort-meade',
    name: 'Fort Meade (NSA Headquarters)',
    type: 'military',
    lat: 39.109,
    lng: -76.74,
    description: 'Headquarters of the US National Security Agency and US Cyber Command.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Fort_Meade',
  },
  {
    id: 'cyber-gchq',
    name: 'GCHQ Headquarters',
    type: 'military',
    lat: 51.8994,
    lng: -2.1247,
    description:
      'Headquarters of the UK Government Communications Headquarters (signals intelligence).',
    wikiUrl: 'https://en.wikipedia.org/wiki/The_Doughnut',
  },
  {
    id: 'choke-suez',
    name: 'Suez Canal',
    type: 'chokepoint',
    lat: 30.604,
    lng: 32.327,
    description:
      'Critical artificial sea-level waterway in Egypt, connecting the Mediterranean and Red Sea.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Suez_Canal',
  },
  {
    id: 'choke-panama',
    name: 'Panama Canal',
    type: 'chokepoint',
    lat: 9.08,
    lng: -79.68,
    description: 'Connects the Atlantic and Pacific, critical for maritime trade.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Panama_Canal',
  },
  {
    id: 'choke-malacca',
    name: 'Strait of Malacca',
    type: 'chokepoint',
    lat: 2.8,
    lng: 101.3,
    description:
      'One of the most important shipping lanes in the world, linking China/Japan to the Middle East.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Strait_of_Malacca',
  },
  {
    id: 'choke-hormuz',
    name: 'Strait of Hormuz',
    type: 'chokepoint',
    lat: 26.5667,
    lng: 56.25,
    description: 'The absolute most critical transit chokepoint for global oil supplies.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Strait_of_Hormuz',
  },
  {
    id: 'choke-bab-el-mandeb',
    name: 'Bab-el-Mandeb',
    type: 'chokepoint',
    lat: 12.5833,
    lng: 43.3333,
    description:
      'Strait connecting the Red Sea to the Gulf of Aden, heavily contested by Houthi insurgents.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Bab-el-Mandeb',
  },
  {
    id: 'choke-bosporus',
    name: 'Bosporus Strait',
    type: 'chokepoint',
    lat: 41.02,
    lng: 29,
    description:
      'Connects the Black Sea to the Mediterranean, controlled by Turkey (Montreux Convention).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Bosporus',
  },
  {
    id: 'choke-dardanelles',
    name: 'Dardanelles',
    type: 'chokepoint',
    lat: 40.2167,
    lng: 26.4333,
    description:
      'Narrow strait in northwestern Turkey connecting the Aegean Sea to the Sea of Marmara.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Dardanelles',
  },
  {
    id: 'choke-gibraltar',
    name: 'Strait of Gibraltar',
    type: 'chokepoint',
    lat: 35.9667,
    lng: -5.4833,
    description: 'Narrow opening connecting the Atlantic Ocean to the Mediterranean Sea.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Strait_of_Gibraltar',
  },
  {
    id: 'choke-taiwan-strait',
    name: 'Taiwan Strait',
    type: 'chokepoint',
    lat: 24.8,
    lng: 119.8,
    description: 'Highly contested waterway separating China and Taiwan.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Taiwan_Strait',
  },
  {
    id: 'choke-suwalki',
    name: 'Suwałki Gap',
    type: 'chokepoint',
    lat: 54.1,
    lng: 23,
    description:
      'Thin strip of land connecting NATO Baltics to Poland, flanked by Belarus and Kaliningrad.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Suwa%C5%82ki_Gap',
  },
  {
    id: 'choke-kiel',
    name: 'Kiel Canal',
    type: 'chokepoint',
    lat: 53.8667,
    lng: 9.1333,
    description: 'Freshwater canal linking the North Sea and the Baltic Sea.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Kiel_Canal',
  },
  {
    id: 'choke-cape-hope',
    name: 'Cape of Good Hope',
    type: 'chokepoint',
    lat: -34.3583,
    lng: 18.4719,
    description: 'Major alternative shipping route bypassing the Suez Canal.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Cape_of_Good_Hope',
  },
  {
    id: 'oil-ras-tanura',
    name: 'Ras Tanura',
    type: 'oil',
    lat: 26.65,
    lng: 50.15,
    description: "Saudi Arabia's oldest, largest, and most critical oil refinery and terminal.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Ras_Tanura',
  },
  {
    id: 'oil-abqaiq',
    name: 'Abqaiq Oil Processing Facility',
    type: 'oil',
    lat: 25.9333,
    lng: 49.6833,
    description: "World's largest oil processing plant, critical to Saudi Aramco production.",
    wikiUrl: 'https://en.wikipedia.org/wiki/Abqaiq',
  },
  {
    id: 'oil-bayan-obo',
    name: 'Bayan Obo Mining District',
    type: 'mining',
    lat: 41.7667,
    lng: 109.9667,
    description: 'The absolute largest deposit of rare-earth elements on the planet (China).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Bayan_Obo_Mining_District',
  },
  {
    id: 'oil-ghawar',
    name: 'Ghawar Oil Field',
    type: 'oil',
    lat: 25,
    lng: 49.5,
    description: 'The largest conventional oil field in the world (Saudi Arabia).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Ghawar_Field',
  },
  {
    id: 'oil-cushing',
    name: 'Cushing Oil Hub',
    type: 'oil',
    lat: 35.9556,
    lng: -96.7628,
    description: 'The Pipeline Crossroads of the World, massive US oil storage hub.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Cushing,_Oklahoma',
  },
  {
    id: 'oil-permian',
    name: 'Permian Basin Core',
    type: 'oil',
    lat: 31.85,
    lng: -102.3667,
    description: 'Highest-producing oil basin in the United States (West Texas).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Permian_Basin_(North_America)',
  },
  {
    id: 'oil-south-pars',
    name: 'South Pars / North Dome',
    type: 'oil',
    lat: 26.6333,
    lng: 51.5833,
    description: "The world's largest natural gas field, shared by Iran and Qatar.",
    wikiUrl: 'https://en.wikipedia.org/wiki/South_Pars/North_Dome_Gas-Condensate_field',
  },
  {
    id: 'oil-novy-port',
    name: 'Novy Port Oil Terminal',
    type: 'oil',
    lat: 67.8,
    lng: 72.9333,
    description: 'Strategic Russian Arctic oil export terminal.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Novy_Port',
  },
  {
    id: 'mining-chuquicamata',
    name: 'Chuquicamata Copper Mine',
    type: 'mining',
    lat: -22.3,
    lng: -68.9,
    description: 'One of the largest open pit copper mines in the world (Chile).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Chuquicamata',
  },
  {
    id: 'mining-tenke',
    name: 'Tenke Fungurume Mine',
    type: 'mining',
    lat: -10.55,
    lng: 26.1833,
    description: "One of the world's largest copper and cobalt mines (DRC).",
    wikiUrl: 'https://en.wikipedia.org/wiki/Tenke_Fungurume_Mine',
  },
  {
    id: 'mining-grasberg',
    name: 'Grasberg Mine',
    type: 'mining',
    lat: -4.0533,
    lng: 137.1122,
    description: 'The largest gold mine and second-largest copper mine in the world (Indonesia).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Grasberg_mine',
  },
  {
    id: 'mining-escondida',
    name: 'Escondida',
    type: 'mining',
    lat: -24.27,
    lng: -69.07,
    description: 'The highest producing copper mine in the world (Chile).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Minera_Escondida',
  },
  {
    id: 'oil-jamnagar',
    name: 'Jamnagar Refinery',
    type: 'oil',
    lat: 22.3486,
    lng: 69.8525,
    description: 'The largest oil refinery complex in the world (India).',
    wikiUrl: 'https://en.wikipedia.org/wiki/Jamnagar_Refinery',
  },
  {
    id: 'oil-fujairah',
    name: 'Fujairah Oil Terminal',
    type: 'oil',
    lat: 25.15,
    lng: 56.35,
    description: 'Critical UAE port that bypasses the Strait of Hormuz.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Fujairah',
  },
  {
    id: 'oil-al-zour',
    name: 'Al Zour Refinery',
    type: 'oil',
    lat: 28.718,
    lng: 48.337,
    description: 'Massive new oil refinery in Kuwait, one of the largest in the Middle East.',
    wikiUrl: 'https://en.wikipedia.org/wiki/Al_Zour_Refinery',
  },
];

// ── LIVE TRACKING SIMULATION ENGINE ───────────────────────────────────────────
// These endpoints generate realistic military traffic based on current geogrphic hotspots.
// Includes 'history' for aircraft to show flight paths/routes on the map.

let aircraftStore = new Map<string, any>();
let shipStore = new Map<string, any>();

function generateLiveAssets() {
  const regions = [
    { name: 'Middle East', lat: 32, lng: 35, spread: 8 },
    { name: 'Europe / UKR', lat: 48, lng: 35, spread: 10 },
    { name: 'Asia / HK / TW', lat: 24, lng: 120, spread: 6 },
    { name: 'North America', lat: 38, lng: -77, spread: 12 },
  ];

  const acTypes = [
    {
      type: 'RC-135V Rivet Joint',
      callsign: 'JAKE',
      op: 'US Air Force',
      desc: 'Electronic signals intelligence platform.',
    },
    {
      type: 'P-8A Poseidon',
      callsign: 'PELICAN',
      op: 'US Navy',
      desc: 'Maritime patrol and anti-submarine warfare.',
    },
    {
      type: 'E-3 Sentry',
      callsign: 'NATO01',
      op: 'NATO',
      desc: 'Airborne early warning and control (AWACS).',
    },
    {
      type: 'Global Hawk',
      callsign: 'FORTE10',
      op: 'USAF OSINT',
      desc: 'High-altitude long-endurance surveillance drone.',
    },
    {
      type: 'Eurofighter Typhoon',
      callsign: 'RAZOR',
      op: 'Royal Air Force',
      desc: 'Multi-role combat aircraft on patrol.',
    },
    {
      type: 'A330 MRT',
      callsign: 'TARTN',
      op: 'French Air Force',
      desc: 'Aerial refueling and transport.',
    },
  ];

  const shipTypes = [
    {
      type: 'Arleigh Burke Destroyer',
      country: 'USA',
      names: ['USS Carney', 'USS Laboon', 'USS Mason'],
    },
    { type: 'Type 45 Destroyer', country: 'UK', names: ['HMS Diamond', 'HMS Duncan'] },
    { type: 'Frigate', country: 'France', names: ['Languedoc', 'Alsace'] },
    { type: 'Intelligence Ship', country: 'OSINT', names: ['Unknown Signal', 'Ghost Tracker'] },
  ];

  // Generate 12-18 aircraft
  const newAc: any[] = [];
  for (let i = 0; i < 15; i++) {
    const reg = regions[Math.floor(Math.random() * regions.length)];
    const ac = acTypes[Math.floor(Math.random() * acTypes.length)];
    const id = `ac-${i}`;

    // Smooth movement if already exists
    const existing = aircraftStore.get(id);
    let lat = existing
      ? existing.lat + (Math.random() - 0.5) * 0.1
      : reg.lat + (Math.random() - 0.5) * reg.spread;
    let lng = existing
      ? existing.lng + (Math.random() - 0.5) * 0.1
      : reg.lng + (Math.random() - 0.5) * reg.spread;

    let history = existing?.history || [];
    if (history.length > 20) history.shift();
    history.push([lat, lng]);

    const data = {
      id,
      callsign: `${ac.callsign}${Math.floor(Math.random() * 99)}`,
      type: ac.type,
      operator: ac.op,
      description: ac.desc,
      lat,
      lng,
      alt: existing
        ? Math.max(10000, existing.alt + (Math.random() - 0.5) * 500)
        : 25000 + Math.random() * 10000,
      speed: existing
        ? Math.max(300, existing.speed + (Math.random() - 0.5) * 20)
        : 400 + Math.random() * 150,
      heading: existing
        ? (existing.heading + (Math.random() - 0.5) * 5) % 360
        : Math.random() * 360,
      history,
    };
    aircraftStore.set(id, data);
    newAc.push(data);
  }

  // Generate 8-12 ships
  const newShips: any[] = [];
  for (let i = 0; i < 10; i++) {
    const reg = regions[Math.floor(Math.random() * regions.length)];
    const s = shipTypes[Math.floor(Math.random() * shipTypes.length)];
    const id = `ship-${i}`;

    const existing = shipStore.get(id);
    let lat = existing
      ? existing.lat + (Math.random() - 0.5) * 0.02
      : reg.lat + (Math.random() - 0.5) * reg.spread;
    let lng = existing
      ? existing.lng + (Math.random() - 0.5) * 0.02
      : reg.lng + (Math.random() - 0.5) * reg.spread;

    const data = {
      id,
      name: s.names[Math.floor(Math.random() * s.names.length)],
      type: s.type,
      country: s.country,
      lat,
      lng,
      speed: 15 + Math.random() * 15,
      heading: Math.random() * 360,
    };
    shipStore.set(id, data);
    newShips.push(data);
  }
}

// Initial generation
generateLiveAssets();
setInterval(generateLiveAssets, 10000); // Update every 10s

app.get('/api/aircraft', (req, res) => {
  res.json({
    aircraft: Array.from(aircraftStore.values()),
    ships: Array.from(shipStore.values()),
  });
});

app.get('/api/strategic-assets', (req, res) => {
  res.json(STRATEGIC_ASSETS);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
