import * as React from 'react';

// Lightweight Slot implementation used as a build-time fallback.
// Matches basic behaviour of Radix `Slot` for composition.
export const Slot = React.forwardRef(function Slot(
  { children, as: Comp = 'span', ...props }: any,
  ref: any
) {
  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <Comp ref={ref} {...props}>
      {children}
    </Comp>
  );
});

export default Slot;
