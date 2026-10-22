---
layout: page
title: Blog
lead: Notes on CSS, JavaScript and things I'm learning.
permalink: /blog/
---

<ul class="posts">
  {%- for post in site.posts %}
  <li>
    <a class="post-card" href="{{ post.url | relative_url }}">
      <time class="post-card__date" datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%b %-d, %Y" }}</time>
      <span class="post-card__title">{{ post.title | escape }}</span>
      {% include icon.html name="arrow-right" px=18 %}
    </a>
  </li>
  {%- endfor %}
</ul>
