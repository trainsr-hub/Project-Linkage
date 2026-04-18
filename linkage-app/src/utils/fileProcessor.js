import yaml from 'js-yaml';

export const parseLinkageFile = (content) => {
  const lines = content.split('\n');
  let part1 = "";
  let part2 = "";
  let part3 = "";
  let dbLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('Linkage_DB:')) {
      dbLineIndex = i;
      break;
    }
  }

  if (dbLineIndex !== -1) {
    part1 = lines.slice(0, dbLineIndex + 1).join('\n') + '\n';
    let currentIndex = dbLineIndex + 1;
    while (currentIndex < lines.length) {
      const line = lines[currentIndex];
      if (line.trim() === "" || line.startsWith('  ')) {
        part2 += line + '\n';
        currentIndex++;
      } else { break; }
    }
    part3 = lines.slice(currentIndex).join('\n');

    try {
      const parsedData = yaml.load(part2);
      return { part1, part3, parsedData, success: true };
    } catch (e) {
      console.error("YAML Parse Error:", e);
      return { success: false, error: "YAML_PARSE_ERROR" };
    }
  }
  return { success: false, error: "DB_NOT_FOUND" };
};

export const composeLinkageFile = (part1, dataObject, part3) => {
  // Dump YAML với indent 2 và bỏ dấu check null/undefined nếu cần
  const newPart2 = yaml.dump(dataObject, { indent: 2, lineWidth: -1 });
  
  // Format lại thụt lề 2 space cho mỗi dòng của YAML dump
  const formattedPart2 = newPart2.split('\n')
    .filter(line => line.trim() !== "")
    .map(line => '  ' + line)
    .join('\n') + '\n';
  return part1 + formattedPart2 + part3;
};