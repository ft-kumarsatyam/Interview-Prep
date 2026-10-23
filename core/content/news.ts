import newsJson from "@/data/news-sources.json";
import type { NewsFeed } from "@/core/content/types";

export const news = {
  feeds: newsJson.feeds as NewsFeed[],
  categories: newsJson.categories,
  browseOnly: newsJson.browseOnly,
  googleNews: newsJson.googleNews,
  maxItemsPerFeed: newsJson.maxItemsPerFeed,
};
