import React from 'react';
import { Box } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitPage, FusebitSection } from '@5qtrs/fusebit-page';
import { FusebitText, FusebitTextType, FusebitTextWeight } from '@5qtrs/fusebit-text';
import { FusebitColor, opacity } from '@5qtrs/fusebit-color';
import { FusebitLink } from '@5qtrs/fusebit-link';
import { FusebitPost, FusebitPostUrl, FusebitPostCard, FusebitPostProps } from '@5qtrs/fusebit-blog';
import { posts } from './posts';

// ------------------
// Internal Constants
// ------------------

const context = { loaded: false };
const lookupByDate: BlogPostDateLookup = {};

// ------------------
// Internal Functions
// ------------------

function loadPosts() {
  for (const post of posts) {
    const meta = post.meta;
    const { year, month, day } = post.meta;
    lookupByDate[year] = lookupByDate[year] || {};
    lookupByDate[year][month] = lookupByDate[year][month] || {};
    lookupByDate[year][month][day] = lookupByDate[year][month][day] || {};
    lookupByDate[year][month][day][meta.postId] = post;
  }
}

function getPost(year?: number, month?: number, day?: number, postId?: string) {
  if (year && lookupByDate[year]) {
    const forYear = lookupByDate[year];
    if (month && forYear[month]) {
      const forMonth = forYear[month];
      if (day && forMonth[day]) {
        const forDay = forMonth[day];
        return postId ? forDay[postId] : undefined;
      }
    }
  }
  return undefined;
}

function getPosts(year?: number, month?: number, day?: number, postId?: string): BlogPost[] {
  const filteredPosts = [];
  for (const post of posts) {
    if (year !== undefined && year !== post.meta.year) {
      continue;
    }
    if (month !== undefined && month !== post.meta.month) {
      continue;
    }
    if (day !== undefined && day !== post.meta.day) {
      continue;
    }
    if (postId !== undefined && postId !== post.meta.postId) {
      continue;
    }
    filteredPosts.push(post);
  }
  return filteredPosts;
}

function getPostSummaries(somePosts: BlogPost[], isMobile?: boolean) {
  const summaries = [];
  let key = 0;
  for (const post of somePosts) {
    if (isMobile || key > 0) {
      summaries.push(
        <Box key={key++} stretch height={1} marginTop={20} marginBottom={20} background={FusebitColor.light} />
      );
    }
    summaries.push(<FusebitPostCard key={key++} {...post.meta} />);
  }
  return <>{summaries}</>;
}

// -------------------
// Internal Types
// -------------------

type BlogPost = { meta: FusebitPostProps; Post: any };
type BlogPostLookup = { [index: string]: BlogPost };
type BlogPostDateLookup = { [index: number]: { [index: number]: { [index: number]: BlogPostLookup } } };

type BlogProps = {
  year?: number;
  month?: number;
  day?: number;
};

// -------------------
// Internal Components
// -------------------

function MobileVersion({ year, month, day }: BlogProps) {
  const filteredPosts = getPosts(year, month, day);
  return (
    <Box vertical>
      <FusebitText
        fontSize={32}
        type={FusebitTextType.header1}
        color={FusebitColor.red}
        weight={FusebitTextWeight.light}
      >
        THE FUSEBIT BLOG
      </FusebitText>
      <Box height={10} />
      <FusebitText type={FusebitTextType.bodyLarge}>
        The latest news, technical articles and industry insights from the Fusebit team
      </FusebitText>

      <Box marginTop={40} width="100%" right>
        <Box>
          <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
            Latest Posts
          </FusebitText>
        </Box>
      </Box>
      {getPostSummaries(filteredPosts, true)}
    </Box>
  );
}

function NonMobileVersion({ year, month, day }: BlogProps) {
  const filteredPosts = getPosts(year, month, day);
  return (
    <Box vertical>
      <FusebitText type={FusebitTextType.header1} color={FusebitColor.red} weight={FusebitTextWeight.light}>
        THE FUSEBIT BLOG
      </FusebitText>
      <Box height={20} />
      <FusebitText type={FusebitTextType.bodyLarge}>
        The latest news, technical articles and industry insights from the Fusebit team
      </FusebitText>

      <Box marginTop={75} width="100%" right>
        <Box>
          <FusebitText type={FusebitTextType.body} weight={FusebitTextWeight.bold}>
            Latest Posts
          </FusebitText>
        </Box>
      </Box>
      {getPostSummaries(filteredPosts)}
    </Box>
  );
}

// -------------------
// Exported Components
// -------------------

export function Blog({ match }: { match?: any }) {
  if (!context.loaded) {
    loadPosts();
    context.loaded = true;
  }

  let postId: string | undefined = undefined;
  let year: number | undefined = undefined;
  let month: number | undefined = undefined;
  let day: number | undefined = undefined;

  if (match.params) {
    const params = match.params;
    postId = params.postId ? params.postId.split('#')[0] : undefined;
    year = parseInt(params.year) || undefined;
    month = parseInt(params.month) || undefined;
    day = parseInt(params.day) || undefined;
  }
  const post = getPost(year, month, day, postId);
  if (post) {
    return <FusebitPost {...post.meta}>{post.Post()}</FusebitPost>;
  }

  return (
    <FusebitPage>
      <FusebitSection>
        <MediaQuery mediaType={MediaType.mobile}>
          <MobileVersion year={year} month={month} day={day} />
        </MediaQuery>
        <MediaQuery mediaType={MediaType.allExceptMobile}>
          <NonMobileVersion year={year} month={month} day={day} />
        </MediaQuery>
      </FusebitSection>
    </FusebitPage>
  );
}
