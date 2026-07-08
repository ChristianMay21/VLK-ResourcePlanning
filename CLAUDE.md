# Style Guide

## Styling
- Style rules targeting a specific component's markup should exist only in that component's SCSS module. Anything global should be imported into that component's SCSS module.
- If components need state-dependent styling, the state should be reflected in a data-attribute and the accompanying style should look for that data-attribute.
- By default, a single element should have only one class. This class should have one and only one top-level rule in that component's stylesheet. All complex selectors ultimately targeting this element (styles with combinators, e.g. `class-2 class-1, class-2 + class-1`, or under specific states, e.g. :hover or media queries) should be nested under the main selector, e.g.:
```
.class-1 {
  //styles

  .class-2 & {
    //styles
  }

  &:hover, &:focus {
    //styles
  }

  @include max-width-768px {
    //styles
  }
```
- Global styles should not be edited without explicit consultation with the user.
- Use the design tokens in src/app/styles/open-props whenever possible - don't reinvent the wheel.
- Avoid magic number solutions
- Class names should appear in the `.scss` file in the order of their appearance within the HTML.
- For complex layout, consider modern CSS grid solutions first
- Think carefully before using absolute positioning and negative margins

## Markup
- If component state is made available to styles as a data-attribute, the data-attribute should be on the top-level HTML element of the component

## React
- Keep React minimal and readable - layer on 'fancy' functionality only if it actually solves a problem.
- Do not destructure props in the function signature. Accept `props: ComponentProps` and access via `props.x`.

## TypeScript
- Prefer traditional functions to arrow functions - they're more readable.
- Avoid using TypeScript when you could use CSS
- Prefer `fetch` to `XMLHttpRequest`
- We are using ES modules
- Ternary expressions are good in moderation, but messy when they get complex
