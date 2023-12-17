export const getAmountAndDescriptionFromSmsBody = (
  smsBody?: string
): {
  state: boolean;
  errorText?: string;
  amount?: number;
  description?: string;
} => {
  //  "Tani 5***9626 toot dansand ORLOGO:50,000.00MNT guilgee hiigdej ULDEGDEL:50,440.00MNT bolloo. Guilgenii utga:88266716";

  if (!smsBody) {
    return {
      state: false,
      errorText: "Хоосон мессеж"
    };
  }

  const descriptionStartIndex = smsBody
    .toLowerCase()
    .search("guilgeenii utga:");

  if (descriptionStartIndex < 0) {
    return {
      state: false,
      errorText: "Гүйлгээний мэдээлэл буруу"
    };
  }

  const regexPattern = /ORLOGO:([\d,]+(?:\.\d+)?)MNT/;
  const match = smsBody.match(regexPattern);

  // Output the matched text
  if (match && match.length >= 2) {
    const extractedText = (match[1] || "") as string;
    const amount = extractedText.replace(/,/g, "");
    return {
      state: true,
      amount: Number(amount),
      description: smsBody.substring(descriptionStartIndex + 15)
    };
  } else {
    return {
      state: false,
      errorText: "Гүйлгээний мэдээлэл буруу"
    };
  }
};
