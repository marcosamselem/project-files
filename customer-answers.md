# Customer Question Answers

Answers to the example customer questions, written for each customer's likely
level of understanding.

---

## Question 1 — George (new to search): Records, Indexing, and Custom Ranking

Hi George,

Happy to demystify this for you. These are the core building blocks, and once they click
the rest of Algolia gets much easier.

**Records**
A **record** is a single item you want to be searchable, stored as a JSON object.
Turning a record into a JSON object, allow us to use its attributes later on to improve the search experience.
To illustrate this, let's assume your solution allows customers to order food online from restaurants. In this case,
one restaurant would be one record, and its fields (called attributes) describe
it:

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
An **index** is the container that holds all your records plus the settings that
control how they're searched. Indexing is simply the act of sending your
records to Algolia, where they're organized into a structure optimized to return
results in a few milliseconds. A helpful analogy: the index is like the index at
the back of a book. Algolia builds it ahead of time so that, at search time, it
can jump straight to the matching records instead of scanning everything.

You typically have one index per type of thing you search (e.g. `restaurants`),
and you can update or re-index records as your data changes. For example, if a
restaurant raises its prices or its average rating goes from 4.5 to 4.7, you'd
re-send just that one record (using the same `objectID`), and Algolia updates it
directly. As a result, the new values show up in search within seconds, without the need
to rebuild the whole index.

**Custom Ranking**
Algolia ranks results in two stages. First it applies textual relevance, which means: how
well a record matches the query (typos, matching words, nearest locations, etc.). When several
records are equally relevant, Algolia breaks the tie using your Custom
Ranking: business signals that tell it which of two equally-good matches should
appear first.

Good Custom Ranking attributes are **numeric or boolean** and reflect quality or
popularity. For a restaurant use case, strong candidates are:

- **Number of reviews** — a proxy for popularity and trust
- **Average rating** — a proxy for quality
- **Number of bookings / sales / clicks** — direct business value
- **Recency or "is featured"** flags — freshness or promotion

A practical consideration is that a single signal can be misleading. For example,
a restaurant with a 5.0★ rating based on just three reviews may not deserve to rank
higher than one with a 4.6★ rating from 3,000 reviews. A common approach is to combine
both rating and review count into a single popularity score, allowing Custom Ranking to
account for both quality and demonstrated demand. Focus on a small set of signals that truly
represent what makes a result more valuable or relevant for your business.

I hope this information was helpful. I'd be happy to schedule a call to answer any additional
questions and discuss how Algolia can help enhance your customers' search experience.

Regards,
Marcos
---

## Question 2 — Matt: clearing/deleting indexes feels slow in the new dashboard

Hi Matt,

Thank you for taking the time to share this feedback. I completely understand your frustration, especially if clearing and deleting indexes are actions you perform frequently while iterating and testing changes.

You're correct that these actions now sit behind the **Manage Index** menu in the new dashboard experience, which can introduce additional steps compared to previous workflows. For users who perform these operations regularly during development, that extra friction can certainly impact productivity.

For this type of iterative workflow, I would recommend using either the Algolia API clients or the Algolia CLI, as they provide a much faster and more repeatable experience than performing these actions manually through the dashboard.

For example:

* `deleteIndex()` allows you to remove an index entirely.
* `clearObjects()` removes all records while preserving settings, rules, and synonyms.
* The Algolia CLI also provides commands such as:

  * `algolia indices delete`
  * `algolia indices clear`

These approaches can easily be incorporated into local scripts, development workflows, or CI pipelines, making repeated index operations significantly quicker.

You can find the relevant documentation here:
https://www.algolia.com/doc/guides/sending-and-managing-data/manage-indices-and-apps/manage-indices/how-to/delete-indices

I also appreciate you sharing your feedback regarding the dashboard experience itself. Developer workflows are an important use case, and feedback like this helps highlight areas where the product experience can be improved.

Please let me know more about your workflow if you'd like to discuss ways to further streamline your development process.

Best regards,
Marcos


---

## Question 3 — Leo: how much work is it to integrate Algolia?

Hi Leo,

Thank you for reaching out to me directly about this matter.

Good news: integrating Algolia is typically far less work than teams expect. A
basic, good-quality search experience is usually a matter of hours to a few days,
not weeks, and you don't have to rebuild your stack to adopt it.

At a high level, the process is four steps:

1. **Get your data in** Shape the data you want searchable into records (JSON)
   and send them to an index. You can push records with our API clients (most
   languages and frameworks are supported), use a no-code connector or
   integration (Shopify, Salesforce, databases, etc.), or upload a file. Keeping
   the index in sync as your data changes is the only part that needs a little
   thought.

2. **Configure relevance** Tell Algolia which attributes are searchable, which
   to use for filtering/faceting, and your custom ranking. This is mostly
   configuration, not code, and sensible defaults get you a long way.

3. **Build the search UI** For the front end we provide UI libraries
   (InstantSearch for React, Vue, Angular, vanilla JS, plus mobile) that give you
   search boxes, filters, and results out of the box. If you want more control,
   you can use the lighter-weight JS Helper or call the API directly.

4. **Test and refine** Try real queries, review search analytics, and tune
   ranking over time.

Most of the effort is in step 1 (getting clean data flowing) and step 3 (matching
your design). The search itself (relevance, typo-tolerance, speed), is all handled
for you.

If it's useful, I'll be happy to walk you through a small working prototype on your
own data so you can see the end-to-end effort concretely.

Regards,
Marcos
