type SyntheticSelfTrustEntry = {
  email: string | null;
  phone: string | null;
  answers: {
    selfScore: number;
    futureScore: number;
  };
};

function makeEntry(index: number, selfScore: number, futureScore: number): SyntheticSelfTrustEntry {
  return {
    email: `synthetic${index}@example.com`,
    phone: null,
    answers: {
      selfScore,
      futureScore,
    },
  };
}

/**
 * 100 synthetic questionnaire responses designed to feel plausible:
 *
 * - more people cluster in the middle than the extremes
 * - futureScore is often near selfScore, but not always
 * - low self-trust tends to correlate with lower future trust
 * - higher self-trust tends to correlate with higher future trust
 */
export const selfTrustSyntheticData: SyntheticSelfTrustEntry[] = [
  // selfScore 1 => 4 people
  makeEntry(1, 1, 1),
  makeEntry(2, 1, 2),
  makeEntry(3, 1, 2),
  makeEntry(4, 1, 3),

  // selfScore 2 => 7 people
  makeEntry(5, 2, 1),
  makeEntry(6, 2, 2),
  makeEntry(7, 2, 2),
  makeEntry(8, 2, 3),
  makeEntry(9, 2, 3),
  makeEntry(10, 2, 4),
  makeEntry(11, 2, 2),

  // selfScore 3 => 10 people
  makeEntry(12, 3, 2),
  makeEntry(13, 3, 2),
  makeEntry(14, 3, 3),
  makeEntry(15, 3, 3),
  makeEntry(16, 3, 3),
  makeEntry(17, 3, 4),
  makeEntry(18, 3, 4),
  makeEntry(19, 3, 5),
  makeEntry(20, 3, 3),
  makeEntry(21, 3, 4),

  // selfScore 4 => 12 people
  makeEntry(22, 4, 2),
  makeEntry(23, 4, 3),
  makeEntry(24, 4, 3),
  makeEntry(25, 4, 4),
  makeEntry(26, 4, 4),
  makeEntry(27, 4, 4),
  makeEntry(28, 4, 5),
  makeEntry(29, 4, 5),
  makeEntry(30, 4, 6),
  makeEntry(31, 4, 4),
  makeEntry(32, 4, 5),
  makeEntry(33, 4, 4),

  // selfScore 5 => 16 people
  makeEntry(34, 5, 3),
  makeEntry(35, 5, 4),
  makeEntry(36, 5, 4),
  makeEntry(37, 5, 5),
  makeEntry(38, 5, 5),
  makeEntry(39, 5, 5),
  makeEntry(40, 5, 5),
  makeEntry(41, 5, 6),
  makeEntry(42, 5, 6),
  makeEntry(43, 5, 6),
  makeEntry(44, 5, 7),
  makeEntry(45, 5, 4),
  makeEntry(46, 5, 5),
  makeEntry(47, 5, 6),
  makeEntry(48, 5, 5),
  makeEntry(49, 5, 6),

  // selfScore 6 => 16 people
  makeEntry(50, 6, 4),
  makeEntry(51, 6, 5),
  makeEntry(52, 6, 5),
  makeEntry(53, 6, 6),
  makeEntry(54, 6, 6),
  makeEntry(55, 6, 6),
  makeEntry(56, 6, 6),
  makeEntry(57, 6, 7),
  makeEntry(58, 6, 7),
  makeEntry(59, 6, 7),
  makeEntry(60, 6, 8),
  makeEntry(61, 6, 5),
  makeEntry(62, 6, 6),
  makeEntry(63, 6, 7),
  makeEntry(64, 6, 6),
  makeEntry(65, 6, 7),

  // selfScore 7 => 13 people
  makeEntry(66, 7, 5),
  makeEntry(67, 7, 6),
  makeEntry(68, 7, 6),
  makeEntry(69, 7, 7),
  makeEntry(70, 7, 7),
  makeEntry(71, 7, 7),
  makeEntry(72, 7, 8),
  makeEntry(73, 7, 8),
  makeEntry(74, 7, 8),
  makeEntry(75, 7, 9),
  makeEntry(76, 7, 7),
  makeEntry(77, 7, 8),
  makeEntry(78, 7, 7),

  // selfScore 8 => 10 people
  makeEntry(79, 8, 6),
  makeEntry(80, 8, 7),
  makeEntry(81, 8, 7),
  makeEntry(82, 8, 8),
  makeEntry(83, 8, 8),
  makeEntry(84, 8, 8),
  makeEntry(85, 8, 9),
  makeEntry(86, 8, 9),
  makeEntry(87, 8, 10),
  makeEntry(88, 8, 8),

  // selfScore 9 => 7 people
  makeEntry(89, 9, 7),
  makeEntry(90, 9, 8),
  makeEntry(91, 9, 8),
  makeEntry(92, 9, 9),
  makeEntry(93, 9, 9),
  makeEntry(94, 9, 10),
  makeEntry(95, 9, 9),

  // selfScore 10 => 5 people
  makeEntry(96, 10, 8),
  makeEntry(97, 10, 9),
  makeEntry(98, 10, 9),
  makeEntry(99, 10, 10),
  makeEntry(100, 10, 10),
];