import React from 'react';
import { createRoot } from 'react-dom/client';
import Strands from '../src/components/Strands.web';
import { colors } from '../src/theme/colors';

createRoot(document.getElementById('root')!).render(
  <Strands colors={[colors.plum, colors.lavender, colors.coral, colors.sage]} listening interactive={false} />,
);
