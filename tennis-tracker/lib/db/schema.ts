/**
 * Racket Lab — Drizzle ORM Schema
 * DB: Supabase (PostgreSQL) + Row Level Security
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  date,
  pgEnum,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const stringTypeEnum = pgEnum('string_type', [
  'poly',       // ポリエステル
  'nylon',      // ナイロン（シンセティック）
  'natural_gut', // ナチュラルガット
  'hybrid',     // ハイブリッド
  'multifilament', // マルチフィラメント
])

export const playStyleEnum = pgEnum('play_style', [
  'baseliner',
  'serve_volley',
  'allcourt',
  'aggressive_baseliner',
])

export const ntrpLevelEnum = pgEnum('ntrp_level', [
  'beginner',    // 1.0–2.5
  'intermediate', // 3.0–3.5
  'advanced',    // 4.0–4.5
  'elite',       // 5.0+
])

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * users — Supabase Auth の auth.users と 1:1 対応。
 * profile は JSONB で柔軟に拡張可能。
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Supabase auth.users.id と一致
  username: varchar('username', { length: 50 }).notNull().unique(),
  avatarUrl: text('avatar_url'),
  profile: jsonb('profile').$type<{
    play_style: 'baseliner' | 'serve_volley' | 'allcourt' | 'aggressive_baseliner'
    ntrp_level: 'beginner' | 'intermediate' | 'advanced' | 'elite'
    age_group: 'teens' | '20s' | '30s' | '40s' | '50plus'
    dominant_hand: 'right' | 'left'
    /** 主な使用コートサーフェス */
    primary_surface?: 'hard' | 'clay' | 'omni' | 'grass'
    bio?: string
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Rackets ──────────────────────────────────────────────────────────────────

/**
 * rackets — ラケットのマスタデータ。
 * specs は JSONB で、重量・バランス・フェイスサイズなど可変スペックを保持。
 */
export const rackets = pgTable('rackets', {
  id: uuid('id').primaryKey().defaultRandom(),
  brand: varchar('brand', { length: 100 }).notNull(),       // e.g. "Wilson"
  modelName: varchar('model_name', { length: 200 }).notNull(), // e.g. "Pro Staff 97 v14"
  seriesName: varchar('series_name', { length: 100 }),      // e.g. "Pro Staff"
  releaseDate: date('release_date'),
  imageUrl: text('image_url'),
  affiliateUrls: jsonb('affiliate_urls').$type<{
    amazon?: string
    rakuten?: string
    xebio?: string
  }>(),
  specs: jsonb('specs').$type<{
    weight_g: number               // e.g. 315
    balance_mm: number             // e.g. 310
    face_size_sq_inch: number      // e.g. 97
    string_pattern: string         // e.g. "16x19"
    beam_width_mm: number[]        // e.g. [21, 21, 21] (先端/中央/根本)
    length_inch: number            // e.g. 27
    stiffness_ra?: number          // RA 値
    swing_weight?: number          // スイングウェイト (SW)
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('rackets_brand_idx').on(t.brand),
  index('rackets_model_name_idx').on(t.modelName),
])

// ─── Reviews ──────────────────────────────────────────────────────────────────

/**
 * reviews — ユーザーによるラケット × ガット × テンションのレビュー。
 * scores は integer[] で [power, spin, control, comfort, durability] の 5 項目 1–10。
 */
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  racketId: uuid('racket_id').notNull().references(() => rackets.id, { onDelete: 'cascade' }),

  // ─ スコア (1–10 の整数)
  scorePower:     integer('score_power').notNull(),
  scoreSpinPotential: integer('score_spin_potential').notNull(),
  scoreControl:   integer('score_control').notNull(),
  scoreComfort:   integer('score_comfort').notNull(),
  scoreDurability: integer('score_durability').notNull(),

  // ─ ガット設定
  stringBrand:    varchar('string_brand', { length: 100 }),   // e.g. "Luxilon ALU Power"
  stringType:     stringTypeEnum('string_type').notNull(),
  tensionMain:    integer('tension_main'),   // メインのテンション (lbs)
  tensionCross:   integer('tension_cross'),  // クロスのテンション (lbs)

  // ─ 使用状況
  playtestDurationWeeks: integer('playtest_duration_weeks'), // 何週間使ったか
  commentText:    text('comment_text').notNull(),
  helpfulCount:   integer('helpful_count').default(0).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('reviews_racket_id_idx').on(t.racketId),
  index('reviews_user_id_idx').on(t.userId),
])

// ─── AI Summaries ─────────────────────────────────────────────────────────────

/**
 * ai_summaries — Claude が生成したラケットごとのレビュー要約。
 * 一定件数以上レビューが集まったときに自動生成・更新される。
 */
export const aiSummaries = pgTable('ai_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  racketId: uuid('racket_id').notNull().unique().references(() => rackets.id, { onDelete: 'cascade' }),
  summaryText: text('summary_text').notNull(),           // "このラケットはこんな人向き…"
  pros:        jsonb('pros').$type<string[]>().notNull(), // 強みリスト
  cons:        jsonb('cons').$type<string[]>().notNull(), // 弱みリスト
  targetPlayer: text('target_player'),  // "スピン系ベースライナー向け"
  reviewCount:  integer('review_count').notNull(),        // 要約に使ったレビュー件数
  generatedAt:  timestamp('generated_at').defaultNow().notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  reviews: many(reviews),
}))

export const racketsRelations = relations(rackets, ({ many, one }) => ({
  reviews: many(reviews),
  aiSummary: one(aiSummaries, {
    fields: [rackets.id],
    references: [aiSummaries.racketId],
  }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  racket: one(rackets, {
    fields: [reviews.racketId],
    references: [rackets.id],
  }),
}))

export const aiSummariesRelations = relations(aiSummaries, ({ one }) => ({
  racket: one(rackets, {
    fields: [aiSummaries.racketId],
    references: [rackets.id],
  }),
}))

// ─── Exported type helpers ────────────────────────────────────────────────────

export type User      = typeof users.$inferSelect
export type NewUser   = typeof users.$inferInsert
export type Racket    = typeof rackets.$inferSelect
export type NewRacket = typeof rackets.$inferInsert
export type Review    = typeof reviews.$inferSelect
export type NewReview = typeof reviews.$inferInsert
export type AiSummary = typeof aiSummaries.$inferSelect
