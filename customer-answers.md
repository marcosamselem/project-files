# Customer Question Answers

Answers to the example customer questions, written for each customer's likely
level of understanding.

---

## Question 1 — George (new to search): Records, Indexing, and Custom Ranking

Hi George,

Happy to demystify these — they're the core building blocks, and once they click
the rest of Algolia gets much easier.

**Records**
A *record* is a single item you want to be searchable, stored as a JSON object.
If you were building restaurant search, one restaurant = one record, and its
fields (called *attributes*) describe it:

```json
{
  "objectID": "101422",
  "name": "Town",
  "cuisine": "American",
  "neighborhood": "Carbondale",
  "rating": 4.6,
  "reviews_count": 180
}
```

Each record needs a unique `objectID`. Think of a record as one "row" of search
results a user could click on.

**Indexing**
An *index* is the container that holds all your records plus the settings that
control how they're searched. *Indexing* is simply the act of sending your
records to Algolia, where they're organized into a structure optimized to return
results in a few milliseconds. A helpful analogy: the index is like the index at
the back of a book — Algolia builds it ahead of time so that, at search time, it
can jump straight to the matching records instead of scanning everything.

You typically have one index per type of thing you search (e.g. `restaurants`),
and you can update or re-index records as your data changes.

**Custom Ranking**
Algolia ranks results in two stages. First it applies *textual relevance* (how
well a record matches the query — typos, matching words, etc.). When several
records are equally relevant, Algolia breaks the tie using your **Custom
Ranking**: business signals that tell it which of two equally-good matches should
appear first.

Good Custom Ranking attributes are **numeric or boolean** and reflect quality or
popularity. For a restaurant use case, strong candidates are:

- **Number of reviews** — a proxy for popularity and trust
- **Average rating** — a proxy for quality
- **Number of bookings / sales / clicks** — direct business value
- **Recency or "is featured"** flags — freshness or promotion

A practical tip: a single noisy signal can mislead. A 5.0★ restaurant with 3
reviews probably shouldn't outrank a 4.6★ with 3,000 reviews. A common technique
is to combine rating and review volume into one "popularity" score so Custom
Ranking rewards *both* quality and proven demand. Pick a small number of signals
that genuinely reflect what a "better" result means for your business.

Cheers, and happy to jump on a call to look at your data together.

---

## Question 2 — Matt: clearing/deleting indexes feels slow in the new dashboard

Hi Matt,

Thank you for the honest feedback — that's exactly the kind we want, and I'll make
sure it reaches our product team, because friction during iteration is worth
fixing.

In the meantime, here's something that should actually speed you up: **for
iterative work you don't need the dashboard at all.** Clearing and deleting
indexes are one-liners through the API and the Algolia CLI, which is usually
faster than any UI once you're in a build-test loop.

**Clear an index** (removes all records, keeps the index settings):

```js
// API client
await index.clearObjects();
```
```bash
# Algolia CLI
algolia objects clear <index-name>
```

**Delete an index** (removes records *and* settings):

```js
// API client
await index.delete();
```
```bash
# Algolia CLI
algolia indices delete <index-name>
```

A couple of tips that tend to help while iterating:

- Use the **CLI** so you can wire these into a script or npm command and reset
  your environment in one keystroke.
- If you're resetting often, consider a small reindex script that clears and
  re-pushes in one go — many teams keep this next to their data pipeline.

If you let me know your exact workflow, I'm happy to put together a short script
that does your reset in a single command. And I'll log the dashboard feedback so
the team can reduce those clicks.

Regards,

---

## Question 3 — Leo: how much work is it to integrate Algolia?

Hi Leo,

Good news: integrating Algolia is typically far less work than teams expect — a
basic, good-quality search experience is usually a matter of hours to a few days,
not weeks, and you don't have to rebuild your stack to adopt it.

At a high level, the process is four steps:

1. **Get your data in.** Shape the data you want searchable into records (JSON)
   and send them to an index. You can push records with our API clients (most
   languages and frameworks are supported), use a no-code connector or
   integration (Shopify, Salesforce, databases, etc.), or upload a file. Keeping
   the index in sync as your data changes is the only part that needs a little
   thought.

2. **Configure relevance.** Tell Algolia which attributes are searchable, which
   to use for filtering/faceting, and your custom ranking. This is mostly
   configuration, not code, and sensible defaults get you a long way.

3. **Build the search UI.** For the front end we provide UI libraries
   (InstantSearch for React, Vue, Angular, vanilla JS, plus mobile) that give you
   search boxes, filters, and results out of the box. If you want more control,
   you can use the lighter-weight JS Helper or call the API directly.

4. **Test and refine.** Try real queries, review search analytics, and tune
   ranking over time.

Most of the effort is in step 1 (getting clean data flowing) and step 3 (matching
your design). The search itself — relevance, typo-tolerance, speed — is handled
for you.

If it's useful, I can walk you through a small working prototype on your own data
so you can see the end-to-end effort concretely.

Regards,
