// Builds data/seed/essential_500_pack.json from the compact word table
// embedded in this script. 500 hand-curated CEFR A1–B2 entries split
// across 10 thematic decks. Run with:
//
//   node tools/build-essential-500.mjs
//
// Output: data/seed/essential_500_pack.json
//
// Entry format (pipe-separated, one per line):
//   headword | pos | ipa_uk | ipa_us | cefr | def_en | def_vi | ex_en | ex_vi

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "seed", "essential_500_pack.json");

const PACK = {
  slug: "essential-500",
  name: "Essential English 500",
  description:
    "500 high-frequency English words for Vietnamese learners, CEFR A1 to B2. Hand-curated definitions, Vietnamese meanings, IPA, and example sentences.",
  version: "1.0.0",
  author: "Lexora",
  source: "bundled",
};

const DECKS = [
  {
    slug: "essential-actions",
    name: "Essential Actions",
    description: "High-frequency verbs that drive everyday conversation.",
    difficulty: "beginner",
    tags: ["A1", "A2", "verbs", "essential"],
  },
  {
    slug: "people-and-family",
    name: "People & Family",
    description: "Words for family, relationships, and people you meet daily.",
    difficulty: "beginner",
    tags: ["A1", "nouns", "people", "family"],
  },
  {
    slug: "food-and-drink",
    name: "Food & Drink",
    description: "Common food, drink, and meal vocabulary.",
    difficulty: "beginner",
    tags: ["A1", "A2", "nouns", "food"],
  },
  {
    slug: "home-and-objects",
    name: "Home & Objects",
    description: "Household items, rooms, and the things around you.",
    difficulty: "beginner",
    tags: ["A1", "nouns", "home"],
  },
  {
    slug: "body-and-health",
    name: "Body & Health",
    description: "Body parts, health, and basic medical situations.",
    difficulty: "beginner",
    tags: ["A2", "nouns", "health", "body"],
  },
  {
    slug: "travel-and-places",
    name: "Travel & Places",
    description: "Travel essentials, transport, and locations.",
    difficulty: "beginner",
    tags: ["A2", "travel", "places"],
  },
  {
    slug: "time-and-numbers",
    name: "Time & Numbers",
    description: "Time, dates, frequency, and quantity words.",
    difficulty: "beginner",
    tags: ["A1", "A2", "time", "numbers"],
  },
  {
    slug: "work-and-office",
    name: "Work & Office",
    description: "Workplace vocabulary, meetings, and professional life.",
    difficulty: "intermediate",
    tags: ["B1", "B2", "work", "office"],
  },
  {
    slug: "feelings-and-thoughts",
    name: "Feelings & Thoughts",
    description: "Emotions, opinions, and mental states.",
    difficulty: "intermediate",
    tags: ["A2", "B1", "feelings", "thoughts"],
  },
  {
    slug: "nature-and-weather",
    name: "Nature & Weather",
    description: "Weather, animals, plants, and the natural world.",
    difficulty: "beginner",
    tags: ["A1", "A2", "nature", "weather"],
  },
];

const DECK_SLUGS = DECKS.map((d) => d.slug);

// Each block below is a "deck index | TSV rows". The deck index matches
// the DECKS array above (0..9). Each row is pipe-separated:
//   headword|pos|ipa_uk|ipa_us|cefr|def_en|def_vi|ex_en|ex_vi
//
// Keep entries short but accurate. The Vietnamese is reviewed for
// natural register; IPA is approximate British/American.

const RAW = `
###0
go|verb|/ɡəʊ/|/ɡoʊ/|A1|To move from one place to another.|đi|We go to school every day.|Chúng tôi đi học mỗi ngày.
come|verb|/kʌm/|/kʌm/|A1|To move toward the speaker or a place.|đến|Please come here.|Vui lòng đến đây.
make|verb|/meɪk/|/meɪk/|A1|To create or produce something.|làm, tạo ra|She makes coffee every morning.|Cô ấy pha cà phê mỗi sáng.
do|verb|/duː/|/duː/|A1|To perform an action or task.|làm|I do my homework after dinner.|Tôi làm bài tập sau bữa tối.
take|verb|/teɪk/|/teɪk/|A1|To get hold of something with the hand.|lấy, cầm|Take this book to the library.|Mang cuốn sách này tới thư viện.
give|verb|/ɡɪv/|/ɡɪv/|A1|To hand something to someone.|đưa, tặng|Give me the keys, please.|Đưa tôi chìa khoá, làm ơn.
get|verb|/ɡet/|/ɡet/|A1|To receive or obtain something.|nhận, lấy|I get an email from my teacher.|Tôi nhận email từ giáo viên.
see|verb|/siː/|/siː/|A1|To notice with the eyes.|nhìn thấy|I see a cat in the garden.|Tôi nhìn thấy một con mèo trong vườn.
look|verb|/lʊk/|/lʊk/|A1|To direct your eyes toward something.|nhìn|Look at the moon tonight.|Hãy nhìn mặt trăng tối nay.
hear|verb|/hɪə/|/hɪr/|A1|To notice a sound with the ears.|nghe thấy|I hear music from next door.|Tôi nghe thấy nhạc từ nhà bên.
listen|verb|/ˈlɪsən/|/ˈlɪsən/|A1|To pay attention to a sound.|lắng nghe|Listen to the teacher carefully.|Hãy lắng nghe giáo viên cẩn thận.
speak|verb|/spiːk/|/spiːk/|A1|To say words; to use a language.|nói|Do you speak Vietnamese?|Bạn có nói tiếng Việt không?
talk|verb|/tɔːk/|/tɔːk/|A1|To have a conversation.|trò chuyện|We talk for hours every weekend.|Chúng tôi trò chuyện hàng giờ mỗi cuối tuần.
say|verb|/seɪ/|/seɪ/|A1|To produce words; to state something.|nói|She says hello to everyone.|Cô ấy chào mọi người.
tell|verb|/tel/|/tel/|A1|To give information to someone.|kể, nói cho biết|Please tell me the truth.|Xin nói cho tôi sự thật.
ask|verb|/ɑːsk/|/æsk/|A1|To request information or a favour.|hỏi|May I ask a question?|Tôi có thể hỏi một câu được không?
answer|verb|/ˈɑːnsə/|/ˈænsər/|A1|To respond to a question.|trả lời|Please answer my email.|Vui lòng trả lời email của tôi.
read|verb|/riːd/|/riːd/|A1|To look at written words and understand them.|đọc|I read a book every night.|Tôi đọc sách mỗi tối.
write|verb|/raɪt/|/raɪt/|A1|To form letters or words with a pen.|viết|Please write your name here.|Vui lòng viết tên của bạn vào đây.
work|verb|/wɜːk/|/wɜːrk/|A1|To do a job for money.|làm việc|My mother works in a hospital.|Mẹ tôi làm việc trong bệnh viện.
play|verb|/pleɪ/|/pleɪ/|A1|To take part in a game or have fun.|chơi|Children play in the park.|Trẻ em chơi trong công viên.
eat|verb|/iːt/|/iːt/|A1|To put food in the mouth and swallow.|ăn|We eat rice for lunch.|Chúng tôi ăn cơm trưa.
drink|verb|/drɪŋk/|/drɪŋk/|A1|To take liquid into the mouth.|uống|Drink plenty of water.|Hãy uống nhiều nước.
sleep|verb|/sliːp/|/sliːp/|A1|To rest with the eyes closed.|ngủ|I sleep eight hours every night.|Tôi ngủ tám tiếng mỗi đêm.
wake|verb|/weɪk/|/weɪk/|A1|To stop sleeping.|thức dậy|I wake up at six.|Tôi thức dậy lúc sáu giờ.
walk|verb|/wɔːk/|/wɑːk/|A1|To move on foot at a normal pace.|đi bộ|We walk to school every day.|Chúng tôi đi bộ tới trường mỗi ngày.
run|verb|/rʌn/|/rʌn/|A1|To move quickly on foot.|chạy|She runs in the park each morning.|Cô ấy chạy trong công viên mỗi sáng.
sit|verb|/sɪt/|/sɪt/|A1|To rest on a seat.|ngồi|Please sit down.|Vui lòng ngồi xuống.
stand|verb|/stænd/|/stænd/|A1|To be on your feet.|đứng|Stand up, please.|Vui lòng đứng lên.
buy|verb|/baɪ/|/baɪ/|A1|To get something by paying money.|mua|I buy fruit at the market.|Tôi mua trái cây ở chợ.
sell|verb|/sel/|/sel/|A1|To give something in exchange for money.|bán|They sell flowers near the school.|Họ bán hoa gần trường.
pay|verb|/peɪ/|/peɪ/|A1|To give money for something.|trả tiền|I pay the bill at the restaurant.|Tôi trả tiền ở nhà hàng.
cook|verb|/kʊk/|/kʊk/|A1|To prepare food using heat.|nấu ăn|My father cooks dinner on Sundays.|Bố tôi nấu bữa tối vào chủ nhật.
clean|verb|/kliːn/|/kliːn/|A1|To remove dirt from something.|dọn dẹp, lau|I clean my room every weekend.|Tôi dọn phòng mỗi cuối tuần.
wash|verb|/wɒʃ/|/wɑːʃ/|A1|To clean something with water.|rửa, giặt|Wash your hands before eating.|Hãy rửa tay trước khi ăn.
open|verb|/ˈəʊpən/|/ˈoʊpən/|A1|To move something so it is not closed.|mở|Please open the window.|Vui lòng mở cửa sổ.
close|verb|/kləʊz/|/kloʊz/|A1|To shut something.|đóng|Close the door, please.|Vui lòng đóng cửa.
start|verb|/stɑːt/|/stɑːrt/|A1|To begin doing something.|bắt đầu|We start work at nine.|Chúng tôi bắt đầu làm việc lúc chín giờ.
stop|verb|/stɒp/|/stɑːp/|A1|To end an action or movement.|dừng|Please stop the music.|Vui lòng tắt nhạc.
finish|verb|/ˈfɪnɪʃ/|/ˈfɪnɪʃ/|A2|To complete something.|hoàn thành|I finish my homework at eight.|Tôi hoàn thành bài tập lúc tám giờ.
help|verb|/help/|/help/|A1|To make something easier for someone.|giúp đỡ|Can you help me, please?|Bạn có thể giúp tôi không?
want|verb|/wɒnt/|/wɑːnt/|A1|To wish for something.|muốn|I want a cup of tea.|Tôi muốn một tách trà.
need|verb|/niːd/|/niːd/|A1|To require something.|cần|We need more time.|Chúng tôi cần thêm thời gian.
like|verb|/laɪk/|/laɪk/|A1|To enjoy something or someone.|thích|I like Vietnamese coffee.|Tôi thích cà phê Việt Nam.
love|verb|/lʌv/|/lʌv/|A1|To care deeply about someone or something.|yêu, yêu thích|I love my family.|Tôi yêu gia đình mình.
know|verb|/nəʊ/|/noʊ/|A1|To have information about something.|biết|I know the answer.|Tôi biết câu trả lời.
think|verb|/θɪŋk/|/θɪŋk/|A1|To use your mind to form ideas.|nghĩ|I think you are right.|Tôi nghĩ bạn đúng.
believe|verb|/bɪˈliːv/|/bɪˈliːv/|A2|To feel sure that something is true.|tin, cho rằng|I believe she will come.|Tôi tin cô ấy sẽ tới.
remember|verb|/rɪˈmembə/|/rɪˈmembər/|A2|To bring back information to your mind.|nhớ|Remember to lock the door.|Nhớ khoá cửa nhé.
forget|verb|/fəˈɡet/|/fərˈɡet/|A2|To not remember something.|quên|Don't forget your umbrella.|Đừng quên ô của bạn.
###1
mother|noun|/ˈmʌðə/|/ˈmʌðər/|A1|A female parent.|mẹ|My mother is a teacher.|Mẹ tôi là giáo viên.
father|noun|/ˈfɑːðə/|/ˈfɑːðər/|A1|A male parent.|bố|My father works in an office.|Bố tôi làm việc trong văn phòng.
parent|noun|/ˈpeərənt/|/ˈperənt/|A1|A mother or father.|cha mẹ|My parents live in Hanoi.|Bố mẹ tôi sống ở Hà Nội.
child|noun|/tʃaɪld/|/tʃaɪld/|A1|A young person, son, or daughter.|đứa trẻ|The child is playing outside.|Đứa trẻ đang chơi ở ngoài.
children|noun|/ˈtʃɪldrən/|/ˈtʃɪldrən/|A1|More than one child.|những đứa trẻ|The children love this story.|Bọn trẻ rất thích câu chuyện này.
son|noun|/sʌn/|/sʌn/|A1|A male child.|con trai|Their son is at university.|Con trai họ đang học đại học.
daughter|noun|/ˈdɔːtə/|/ˈdɔːtər/|A1|A female child.|con gái|My daughter is six years old.|Con gái tôi sáu tuổi.
brother|noun|/ˈbrʌðə/|/ˈbrʌðər/|A1|A male sibling.|anh trai, em trai|My brother is taller than me.|Anh tôi cao hơn tôi.
sister|noun|/ˈsɪstə/|/ˈsɪstər/|A1|A female sibling.|chị gái, em gái|I have one sister.|Tôi có một chị gái.
husband|noun|/ˈhʌzbənd/|/ˈhʌzbənd/|A1|The man a woman is married to.|chồng|Her husband is a doctor.|Chồng cô ấy là bác sĩ.
wife|noun|/waɪf/|/waɪf/|A1|The woman a man is married to.|vợ|His wife teaches English.|Vợ anh ấy dạy tiếng Anh.
family|noun|/ˈfæməli/|/ˈfæməli/|A1|A group of people related by blood or marriage.|gia đình|My family is small.|Gia đình tôi nhỏ.
friend|noun|/frend/|/frend/|A1|Someone you know well and like.|bạn|She is my best friend.|Cô ấy là bạn thân nhất của tôi.
neighbour|noun|/ˈneɪbə/|/ˈneɪbər/|A2|A person who lives near you.|hàng xóm|Our neighbours are very kind.|Hàng xóm của chúng tôi rất tốt bụng.
boy|noun|/bɔɪ/|/bɔɪ/|A1|A male child or young man.|cậu bé|The boy is reading a book.|Cậu bé đang đọc sách.
girl|noun|/ɡɜːl/|/ɡɜːrl/|A1|A female child or young woman.|cô bé|The girl is wearing a red dress.|Cô bé mặc váy đỏ.
man|noun|/mæn/|/mæn/|A1|An adult male.|người đàn ông|The man at the door is my uncle.|Người đàn ông ở cửa là chú tôi.
woman|noun|/ˈwʊmən/|/ˈwʊmən/|A1|An adult female.|người phụ nữ|That woman is the new manager.|Người phụ nữ kia là quản lý mới.
people|noun|/ˈpiːpəl/|/ˈpiːpəl/|A1|More than one person.|mọi người|Many people come to the festival.|Nhiều người đến lễ hội.
person|noun|/ˈpɜːsən/|/ˈpɜːrsən/|A1|A human being.|người|She is a kind person.|Cô ấy là người tốt bụng.
baby|noun|/ˈbeɪbi/|/ˈbeɪbi/|A1|A very young child.|em bé|The baby is sleeping.|Em bé đang ngủ.
teenager|noun|/ˈtiːneɪdʒə/|/ˈtiːneɪdʒər/|A2|A person between 13 and 19 years old.|thiếu niên|Teenagers love video games.|Thiếu niên rất thích trò chơi điện tử.
adult|noun|/ˈædʌlt/|/əˈdʌlt/|A2|A fully grown person.|người lớn|Adults often work long hours.|Người lớn thường làm việc nhiều giờ.
grandfather|noun|/ˈɡrænfɑːðə/|/ˈɡrænfɑːðər/|A1|The father of your father or mother.|ông|My grandfather tells great stories.|Ông tôi kể chuyện rất hay.
grandmother|noun|/ˈɡrænmʌðə/|/ˈɡrænmʌðər/|A1|The mother of your father or mother.|bà|My grandmother makes wonderful soup.|Bà tôi nấu canh rất ngon.
uncle|noun|/ˈʌŋkəl/|/ˈʌŋkəl/|A1|The brother of your father or mother.|chú, cậu, bác|My uncle visits us every summer.|Chú tôi đến thăm chúng tôi mỗi mùa hè.
aunt|noun|/ɑːnt/|/ænt/|A1|The sister of your father or mother.|cô, dì, bác|My aunt lives in Da Nang.|Cô tôi sống ở Đà Nẵng.
cousin|noun|/ˈkʌzən/|/ˈkʌzən/|A1|A child of your uncle or aunt.|anh chị em họ|My cousin is a singer.|Anh họ tôi là ca sĩ.
nephew|noun|/ˈnefjuː/|/ˈnefjuː/|A2|A son of your brother or sister.|cháu trai|My nephew loves football.|Cháu trai tôi mê bóng đá.
niece|noun|/niːs/|/niːs/|A2|A daughter of your brother or sister.|cháu gái|My niece won a school prize.|Cháu gái tôi vừa đoạt giải ở trường.
classmate|noun|/ˈklɑːsmeɪt/|/ˈklæsmeɪt/|A2|Someone who is in the same class as you.|bạn cùng lớp|My classmates are very helpful.|Các bạn cùng lớp rất nhiệt tình.
colleague|noun|/ˈkɒliːɡ/|/ˈkɑːliːɡ/|B1|Someone you work with.|đồng nghiệp|My colleagues are friendly.|Đồng nghiệp của tôi thân thiện.
boss|noun|/bɒs/|/bɔːs/|A2|The person who is in charge at work.|sếp|My boss asked for a report.|Sếp tôi yêu cầu một báo cáo.
teacher|noun|/ˈtiːtʃə/|/ˈtiːtʃər/|A1|A person who teaches students.|giáo viên|Our teacher gives us homework every day.|Giáo viên cho chúng tôi bài tập mỗi ngày.
student|noun|/ˈstjuːdənt/|/ˈstuːdənt/|A1|A person who studies at a school.|học sinh, sinh viên|The students are taking an exam.|Các học sinh đang làm bài kiểm tra.
doctor|noun|/ˈdɒktə/|/ˈdɑːktər/|A1|A person trained to treat sick people.|bác sĩ|The doctor will see you now.|Bác sĩ sẽ khám cho bạn ngay.
nurse|noun|/nɜːs/|/nɜːrs/|A1|A person who looks after sick people.|y tá|The nurse gave me medicine.|Y tá đưa thuốc cho tôi.
engineer|noun|/ˌendʒɪˈnɪə/|/ˌendʒɪˈnɪr/|A2|A person who designs machines or buildings.|kỹ sư|My brother is a software engineer.|Anh tôi là kỹ sư phần mềm.
manager|noun|/ˈmænɪdʒə/|/ˈmænɪdʒər/|A2|A person who is in charge of a business or team.|quản lý|The manager is in a meeting.|Quản lý đang họp.
chef|noun|/ʃef/|/ʃef/|A2|A skilled cook in a restaurant.|đầu bếp|The chef prepared a special meal.|Đầu bếp chuẩn bị một bữa ăn đặc biệt.
driver|noun|/ˈdraɪvə/|/ˈdraɪvər/|A1|A person who drives a vehicle.|tài xế|The driver was very careful.|Tài xế lái xe rất cẩn thận.
farmer|noun|/ˈfɑːmə/|/ˈfɑːrmər/|A1|A person who grows crops or raises animals.|nông dân|My grandfather is a farmer.|Ông tôi là nông dân.
artist|noun|/ˈɑːtɪst/|/ˈɑːrtɪst/|A2|A person who creates art.|nghệ sĩ|The artist sold three paintings.|Nghệ sĩ bán được ba bức tranh.
writer|noun|/ˈraɪtə/|/ˈraɪtər/|A2|A person who writes books or articles.|nhà văn|My favourite writer is from Hanoi.|Nhà văn yêu thích của tôi đến từ Hà Nội.
singer|noun|/ˈsɪŋə/|/ˈsɪŋər/|A1|A person who sings.|ca sĩ|The singer has a beautiful voice.|Ca sĩ có giọng hát đẹp.
police|noun|/pəˈliːs/|/pəˈliːs/|A1|The official organisation that keeps order.|cảnh sát|Call the police if you need help.|Hãy gọi cảnh sát nếu bạn cần giúp đỡ.
soldier|noun|/ˈsəʊldʒə/|/ˈsoʊldʒər/|B1|A person who serves in an army.|chiến sĩ|My uncle was a soldier.|Chú tôi từng là chiến sĩ.
guest|noun|/ɡest/|/ɡest/|A2|Someone invited to visit or stay.|khách|We have guests for dinner.|Chúng tôi có khách ăn tối.
stranger|noun|/ˈstreɪndʒə/|/ˈstreɪndʒər/|B1|A person you do not know.|người lạ|Don't talk to strangers.|Đừng nói chuyện với người lạ.
partner|noun|/ˈpɑːtnə/|/ˈpɑːrtnər/|B1|A person you share something with.|đối tác, bạn đời|We work with a local partner.|Chúng tôi làm việc với một đối tác địa phương.
###2
food|noun|/fuːd/|/fuːd/|A1|Something people or animals eat.|thức ăn|Vietnamese food is delicious.|Thức ăn Việt Nam rất ngon.
water|noun|/ˈwɔːtə/|/ˈwɔːtər/|A1|A clear liquid we drink.|nước|Please give me some water.|Vui lòng cho tôi xin chút nước.
rice|noun|/raɪs/|/raɪs/|A1|White grains that are a staple food.|cơm, gạo|Rice is eaten with most meals.|Cơm được ăn cùng hầu hết các bữa.
bread|noun|/bred/|/bred/|A1|A food made from flour and baked.|bánh mì|We buy bread every morning.|Chúng tôi mua bánh mì mỗi sáng.
meat|noun|/miːt/|/miːt/|A1|The flesh of an animal eaten as food.|thịt|This restaurant has good meat dishes.|Quán này có món thịt ngon.
fish|noun|/fɪʃ/|/fɪʃ/|A1|An animal that lives in water; its meat as food.|cá|Fresh fish is sold at the market.|Cá tươi được bán ở chợ.
chicken|noun|/ˈtʃɪkɪn/|/ˈtʃɪkɪn/|A1|A bird kept for meat and eggs.|gà|Grilled chicken is my favourite.|Gà nướng là món tôi thích nhất.
beef|noun|/biːf/|/biːf/|A2|The meat from a cow.|thịt bò|Beef noodle soup is a popular dish.|Phở bò là món ăn được yêu thích.
pork|noun|/pɔːk/|/pɔːrk/|A2|The meat from a pig.|thịt heo|Pork is often used in Vietnamese cooking.|Thịt heo thường được dùng trong nấu ăn Việt Nam.
egg|noun|/eɡ/|/eɡ/|A1|A round object laid by a bird.|trứng|I eat an egg for breakfast.|Tôi ăn một quả trứng vào bữa sáng.
milk|noun|/mɪlk/|/mɪlk/|A1|A white liquid from cows.|sữa|Children drink milk every day.|Trẻ em uống sữa mỗi ngày.
coffee|noun|/ˈkɒfi/|/ˈkɔːfi/|A1|A hot dark drink made from beans.|cà phê|Vietnamese coffee is famous.|Cà phê Việt Nam nổi tiếng.
tea|noun|/tiː/|/tiː/|A1|A hot drink made from leaves.|trà|My grandmother loves green tea.|Bà tôi thích trà xanh.
juice|noun|/dʒuːs/|/dʒuːs/|A1|The liquid from fruit.|nước ép|Orange juice is rich in vitamin C.|Nước cam giàu vitamin C.
beer|noun|/bɪə/|/bɪr/|A2|An alcoholic drink made from grain.|bia|They serve cold beer at the pub.|Quán pub phục vụ bia lạnh.
fruit|noun|/fruːt/|/fruːt/|A1|The sweet part of a plant that we eat.|trái cây|Eat plenty of fruit each day.|Hãy ăn nhiều trái cây mỗi ngày.
vegetable|noun|/ˈvedʒtəbəl/|/ˈvedʒtəbəl/|A1|A plant we eat as food.|rau|Vegetables are good for your health.|Rau tốt cho sức khoẻ.
apple|noun|/ˈæpəl/|/ˈæpəl/|A1|A round red or green fruit.|táo|An apple a day is a good habit.|Mỗi ngày một quả táo là thói quen tốt.
banana|noun|/bəˈnɑːnə/|/bəˈnænə/|A1|A long yellow fruit.|chuối|Bananas grow well in the south.|Chuối trồng tốt ở miền nam.
orange|noun|/ˈɒrɪndʒ/|/ˈɔːrɪndʒ/|A1|A round orange-coloured fruit.|cam|I bought a kilo of oranges.|Tôi mua một ký cam.
salt|noun|/sɔːlt/|/sɑːlt/|A1|A white substance used to flavour food.|muối|Please pass the salt.|Vui lòng đưa muối qua đây.
sugar|noun|/ˈʃʊɡə/|/ˈʃʊɡər/|A1|A sweet white substance.|đường|Do you take sugar in your coffee?|Bạn có cho đường vào cà phê không?
breakfast|noun|/ˈbrekfəst/|/ˈbrekfəst/|A1|The first meal of the day.|bữa sáng|Breakfast is the most important meal.|Bữa sáng là bữa quan trọng nhất.
lunch|noun|/lʌntʃ/|/lʌntʃ/|A1|The meal eaten at midday.|bữa trưa|We have lunch at noon.|Chúng tôi ăn trưa lúc mười hai giờ.
dinner|noun|/ˈdɪnə/|/ˈdɪnər/|A1|The main evening meal.|bữa tối|Dinner is ready at seven.|Bữa tối sẵn sàng lúc bảy giờ.
meal|noun|/miːl/|/miːl/|A1|A time for eating, or the food eaten.|bữa ăn|We share three meals a day.|Chúng tôi ăn ba bữa một ngày.
restaurant|noun|/ˈrestrɒnt/|/ˈrestərɑːnt/|A1|A place where people eat meals.|nhà hàng|This restaurant serves fresh seafood.|Nhà hàng này phục vụ hải sản tươi.
menu|noun|/ˈmenjuː/|/ˈmenjuː/|A1|A list of dishes in a restaurant.|thực đơn|Could I see the menu, please?|Tôi xem thực đơn được không?
order|verb|/ˈɔːdə/|/ˈɔːrdər/|A1|To ask for food in a restaurant.|gọi món|We order noodles every Friday.|Chúng tôi gọi mì mỗi thứ sáu.
delicious|adjective|/dɪˈlɪʃəs/|/dɪˈlɪʃəs/|A1|Tasting very good.|ngon|The soup is delicious.|Món súp rất ngon.
spicy|adjective|/ˈspaɪsi/|/ˈspaɪsi/|A2|Containing strong flavours from spices.|cay|This curry is too spicy for me.|Món cà ri này cay quá đối với tôi.
sweet|adjective|/swiːt/|/swiːt/|A1|Tasting like sugar.|ngọt|The mango is very sweet.|Quả xoài rất ngọt.
sour|adjective|/saʊə/|/saʊr/|A2|Having a sharp taste like lemon.|chua|The yoghurt tastes a bit sour.|Sữa chua hơi chua.
fresh|adjective|/freʃ/|/freʃ/|A2|Recently made or picked.|tươi|We buy fresh vegetables every morning.|Chúng tôi mua rau tươi mỗi sáng.
hot|adjective|/hɒt/|/hɑːt/|A1|At a high temperature.|nóng|The soup is hot.|Món súp nóng.
cold|adjective|/kəʊld/|/koʊld/|A1|At a low temperature.|lạnh|I'd like a cold drink.|Tôi muốn một đồ uống lạnh.
hungry|adjective|/ˈhʌŋɡri/|/ˈhʌŋɡri/|A1|Wanting to eat.|đói|I'm hungry. Let's eat.|Tôi đói rồi. Mình ăn thôi.
thirsty|adjective|/ˈθɜːsti/|/ˈθɜːrsti/|A1|Wanting to drink.|khát|After running, I was thirsty.|Sau khi chạy bộ tôi rất khát.
plate|noun|/pleɪt/|/pleɪt/|A1|A flat dish to put food on.|đĩa|Put the rice on the plate.|Cho cơm lên đĩa.
bowl|noun|/bəʊl/|/boʊl/|A1|A round deep dish.|tô, bát|A bowl of pho, please.|Cho tôi một tô phở.
cup|noun|/kʌp/|/kʌp/|A1|A small container to drink from.|tách, cốc|A cup of tea sounds great.|Một tách trà thì tuyệt vời.
glass|noun|/ɡlɑːs/|/ɡlæs/|A1|A clear container for drinks.|ly thuỷ tinh|Pour the water into a glass.|Rót nước vào ly.
fork|noun|/fɔːk/|/fɔːrk/|A1|A tool with points used for eating.|nĩa|Use a fork for the salad.|Dùng nĩa để ăn salad.
spoon|noun|/spuːn/|/spuːn/|A1|A tool with a rounded end for eating.|thìa, muỗng|Mix it with a spoon.|Khuấy đều bằng thìa.
knife|noun|/naɪf/|/naɪf/|A1|A tool with a sharp blade for cutting.|dao|Use a knife to cut the apple.|Dùng dao cắt táo.
salad|noun|/ˈsæləd/|/ˈsæləd/|A2|A mix of cold raw vegetables.|sa lát|We had a fresh salad for lunch.|Chúng tôi ăn sa lát tươi cho bữa trưa.
soup|noun|/suːp/|/suːp/|A1|A hot liquid food.|súp, canh|Vietnamese soup is light and tasty.|Canh Việt thanh và ngon.
noodle|noun|/ˈnuːdəl/|/ˈnuːdəl/|A2|A long thin strip of food made from flour.|mì, bún|Beef noodles is a popular breakfast.|Phở bò là bữa sáng phổ biến.
cake|noun|/keɪk/|/keɪk/|A1|A sweet food made from flour and sugar.|bánh ngọt|We bought a cake for her birthday.|Chúng tôi mua bánh cho sinh nhật cô ấy.
chocolate|noun|/ˈtʃɒklət/|/ˈtʃɑːklət/|A1|A sweet brown food made from cocoa.|sô-cô-la|Children love chocolate.|Trẻ con thích sô-cô-la.
###3
house|noun|/haʊs/|/haʊs/|A1|A building where people live.|nhà|We bought a small house near the river.|Chúng tôi mua một căn nhà nhỏ gần sông.
home|noun|/həʊm/|/hoʊm/|A1|The place where you live.|nhà, mái ấm|Welcome to my home.|Chào mừng đến nhà tôi.
apartment|noun|/əˈpɑːtmənt/|/əˈpɑːrtmənt/|A2|A set of rooms on one floor.|căn hộ|Their apartment has a great view.|Căn hộ của họ có view đẹp.
room|noun|/ruːm/|/ruːm/|A1|A part of a house with walls.|phòng|This room is bright in the morning.|Phòng này sáng vào buổi sáng.
kitchen|noun|/ˈkɪtʃɪn/|/ˈkɪtʃɪn/|A1|The room where food is prepared.|nhà bếp|Mum is in the kitchen.|Mẹ đang ở trong bếp.
bathroom|noun|/ˈbɑːθruːm/|/ˈbæθruːm/|A1|A room with a toilet and bath.|phòng tắm|The bathroom is at the end of the hall.|Phòng tắm ở cuối hành lang.
bedroom|noun|/ˈbedruːm/|/ˈbedruːm/|A1|A room for sleeping.|phòng ngủ|My bedroom has two windows.|Phòng ngủ của tôi có hai cửa sổ.
living room|phrase|/ˈlɪvɪŋ ruːm/|/ˈlɪvɪŋ ruːm/|A1|The main room for relaxing.|phòng khách|We watch films in the living room.|Chúng tôi xem phim ở phòng khách.
window|noun|/ˈwɪndəʊ/|/ˈwɪndoʊ/|A1|An opening in a wall with glass.|cửa sổ|Open the window for some air.|Mở cửa sổ cho thoáng nhé.
door|noun|/dɔː/|/dɔːr/|A1|A movable barrier for an entrance.|cửa|Please close the door behind you.|Vui lòng đóng cửa lại.
wall|noun|/wɔːl/|/wɔːl/|A1|A vertical structure that forms a room.|tường|We painted the wall light blue.|Chúng tôi sơn tường màu xanh nhạt.
floor|noun|/flɔː/|/flɔːr/|A1|The flat surface you walk on.|sàn nhà|The floor is wet. Be careful.|Sàn ướt đấy. Cẩn thận.
chair|noun|/tʃeə/|/tʃer/|A1|A piece of furniture for sitting on.|ghế|Bring an extra chair, please.|Mang thêm một cái ghế nhé.
table|noun|/ˈteɪbəl/|/ˈteɪbəl/|A1|A piece of furniture with a flat top.|bàn|Put the dishes on the table.|Để chén đĩa lên bàn.
bed|noun|/bed/|/bed/|A1|A piece of furniture for sleeping.|giường|My bed is very comfortable.|Giường của tôi rất êm.
sofa|noun|/ˈsəʊfə/|/ˈsoʊfə/|A2|A long soft seat for several people.|ghế sô-pha|Sit on the sofa and relax.|Ngồi xuống sô-pha thư giãn nào.
lamp|noun|/læmp/|/læmp/|A1|A device that gives light.|đèn|Turn on the lamp.|Bật đèn lên.
clock|noun|/klɒk/|/klɑːk/|A1|A device that shows the time.|đồng hồ treo|The clock on the wall is slow.|Đồng hồ treo tường bị chậm.
key|noun|/kiː/|/kiː/|A1|A small metal object that opens locks.|chìa khoá|I lost my house key.|Tôi mất chìa khoá nhà.
phone|noun|/fəʊn/|/foʊn/|A1|A device for talking to people far away.|điện thoại|My phone is on the table.|Điện thoại tôi ở trên bàn.
television|noun|/ˈtelɪvɪʒən/|/ˈtelɪvɪʒən/|A1|A device for watching programmes.|ti vi|We watch news on television.|Chúng tôi xem tin tức trên ti vi.
computer|noun|/kəmˈpjuːtə/|/kəmˈpjuːtər/|A1|An electronic device for processing information.|máy tính|I use a computer every day.|Tôi dùng máy tính mỗi ngày.
fridge|noun|/frɪdʒ/|/frɪdʒ/|A1|A cold box for storing food.|tủ lạnh|Put the milk in the fridge.|Bỏ sữa vào tủ lạnh.
oven|noun|/ˈʌvən/|/ˈʌvən/|A2|A device for baking and roasting.|lò nướng|Bake the cake in the oven for thirty minutes.|Nướng bánh trong lò ba mươi phút.
stove|noun|/stəʊv/|/stoʊv/|A2|A device for cooking with heat.|bếp nấu|Be careful, the stove is hot.|Cẩn thận, bếp đang nóng.
mirror|noun|/ˈmɪrə/|/ˈmɪrər/|A2|A surface that shows your reflection.|gương|There is a large mirror in the hall.|Có một tấm gương lớn ở hành lang.
shower|noun|/ˈʃaʊə/|/ˈʃaʊər/|A1|A device to wash under running water.|vòi sen|I take a shower every morning.|Tôi tắm vòi sen mỗi sáng.
towel|noun|/ˈtaʊəl/|/ˈtaʊəl/|A1|A piece of cloth used for drying.|khăn|Hand me a clean towel, please.|Đưa cho tôi cái khăn sạch nhé.
soap|noun|/səʊp/|/soʊp/|A1|A substance used with water for washing.|xà phòng|Wash your hands with soap.|Rửa tay bằng xà phòng.
brush|noun|/brʌʃ/|/brʌʃ/|A1|A tool with stiff hairs for cleaning.|bàn chải|Use a brush to clean the floor.|Dùng bàn chải để lau sàn.
sheet|noun|/ʃiːt/|/ʃiːt/|A2|A large flat piece of cloth on a bed.|tấm trải giường|We changed the sheets this morning.|Chúng tôi thay tấm trải giường sáng nay.
blanket|noun|/ˈblæŋkɪt/|/ˈblæŋkɪt/|A2|A thick cloth that keeps you warm.|chăn|It's cold tonight. Bring a blanket.|Tối nay lạnh. Lấy thêm chăn nhé.
curtain|noun|/ˈkɜːtən/|/ˈkɜːrtən/|A2|A piece of cloth that covers a window.|rèm cửa|Open the curtains. The sun is out.|Mở rèm ra. Nắng rồi đấy.
shelf|noun|/ʃelf/|/ʃelf/|A2|A flat board used to store things.|kệ|There are too many books on the shelf.|Có quá nhiều sách trên kệ.
drawer|noun|/drɔː/|/drɔːr/|A2|A box-like container that slides out.|ngăn kéo|The keys are in the top drawer.|Chìa khoá ở ngăn kéo trên cùng.
garden|noun|/ˈɡɑːdən/|/ˈɡɑːrdən/|A1|A piece of land with plants near a house.|vườn|We grow vegetables in the garden.|Chúng tôi trồng rau trong vườn.
balcony|noun|/ˈbælkəni/|/ˈbælkəni/|A2|A platform that sticks out of a building.|ban công|We sit on the balcony in the evening.|Chúng tôi ngồi ngoài ban công buổi tối.
stairs|noun|/steəz/|/sterz/|A1|Steps that lead from one floor to another.|cầu thang|Take the stairs to the second floor.|Đi cầu thang lên tầng hai.
roof|noun|/ruːf/|/ruːf/|A2|The top covering of a building.|mái nhà|The roof was damaged by the storm.|Mái nhà bị bão làm hỏng.
garage|noun|/ˈɡærɑːʒ/|/ɡəˈrɑːʒ/|A2|A building for keeping a car.|nhà để xe|We park the car in the garage.|Chúng tôi đỗ xe trong nhà để xe.
elevator|noun|/ˈelɪveɪtə/|/ˈeləveɪtər/|A2|A machine that carries people between floors.|thang máy|The elevator is out of order.|Thang máy đang hỏng.
furniture|noun|/ˈfɜːnɪtʃə/|/ˈfɜːrnɪtʃər/|A2|Tables, chairs, and other pieces in a home.|đồ nội thất|We bought new furniture for the living room.|Chúng tôi mua đồ nội thất mới cho phòng khách.
candle|noun|/ˈkændəl/|/ˈkændəl/|A2|A stick of wax with a string that burns.|nến|Light a candle when the power is out.|Thắp nến khi mất điện.
electricity|noun|/ɪˌlekˈtrɪsəti/|/ɪˌlekˈtrɪsəti/|A2|The energy that runs machines and lights.|điện|There is no electricity today.|Hôm nay mất điện.
remote|noun|/rɪˈməʊt/|/rɪˈmoʊt/|A2|A small device to control a TV from a distance.|điều khiển|Where is the TV remote?|Điều khiển ti vi đâu rồi?
basket|noun|/ˈbɑːskɪt/|/ˈbæskɪt/|A1|A container made of woven material.|giỏ|Put the fruit in the basket.|Bỏ trái cây vào giỏ.
broom|noun|/bruːm/|/bruːm/|A2|A long-handled brush for sweeping floors.|chổi|Use a broom to clean the porch.|Dùng chổi quét sân.
trash|noun|/træʃ/|/træʃ/|A2|Things you throw away.|rác|Please take out the trash.|Vui lòng đổ rác.
bucket|noun|/ˈbʌkɪt/|/ˈbʌkɪt/|A2|A round open container with a handle.|xô|Fill the bucket with water.|Đổ đầy xô với nước.
laundry|noun|/ˈlɔːndri/|/ˈlɔːndri/|A2|Clothes that need washing.|đồ giặt|I do the laundry on Saturdays.|Tôi giặt đồ vào thứ bảy.
###4
body|noun|/ˈbɒdi/|/ˈbɑːdi/|A1|The physical form of a person or animal.|cơ thể|Exercise keeps your body strong.|Tập thể dục giúp cơ thể khoẻ mạnh.
head|noun|/hed/|/hed/|A1|The top part of the body containing the brain.|đầu|My head hurts a little.|Đầu tôi hơi đau.
hair|noun|/heə/|/her/|A1|The threads that grow on your head.|tóc|She has long black hair.|Cô ấy có mái tóc đen dài.
face|noun|/feɪs/|/feɪs/|A1|The front of the head.|khuôn mặt|Wash your face before bed.|Rửa mặt trước khi đi ngủ.
eye|noun|/aɪ/|/aɪ/|A1|The part of the body used for seeing.|mắt|My eyes are tired.|Mắt tôi mỏi.
ear|noun|/ɪə/|/ɪr/|A1|The part of the body used for hearing.|tai|Music sounds clearer in your right ear.|Nhạc nghe rõ hơn ở tai phải.
nose|noun|/nəʊz/|/noʊz/|A1|The part of the face used for smelling.|mũi|My nose is blocked from a cold.|Mũi tôi bị tắc vì cảm.
mouth|noun|/maʊθ/|/maʊθ/|A1|The opening for eating and speaking.|miệng|Open your mouth, please.|Vui lòng há miệng.
tooth|noun|/tuːθ/|/tuːθ/|A1|A hard white part in the mouth used for biting.|răng|Brush your teeth twice a day.|Đánh răng hai lần một ngày.
tongue|noun|/tʌŋ/|/tʌŋ/|A2|The soft part inside the mouth used for tasting.|lưỡi|Stick out your tongue and say ah.|Lè lưỡi và nói a.
neck|noun|/nek/|/nek/|A1|The part of the body that joins the head to the shoulders.|cổ|I have a stiff neck.|Cổ tôi bị cứng.
shoulder|noun|/ˈʃəʊldə/|/ˈʃoʊldər/|A2|The part of the body at the top of the arm.|vai|My shoulders hurt after work.|Vai tôi đau sau khi làm việc.
arm|noun|/ɑːm/|/ɑːrm/|A1|The long part of the body from the shoulder to the hand.|cánh tay|He has strong arms.|Anh ấy có cánh tay khoẻ.
hand|noun|/hænd/|/hænd/|A1|The part of the body at the end of the arm.|bàn tay|Wash your hands often.|Hãy rửa tay thường xuyên.
finger|noun|/ˈfɪŋɡə/|/ˈfɪŋɡər/|A1|One of the five long parts of the hand.|ngón tay|I cut my finger while cooking.|Tôi đứt tay khi nấu ăn.
leg|noun|/leɡ/|/leɡ/|A1|The part of the body used for walking.|chân|My legs are sore from running.|Chân tôi đau sau khi chạy.
foot|noun|/fʊt/|/fʊt/|A1|The end of the leg you stand on.|bàn chân|Take off your shoes; my floor is clean.|Cởi giày ra; sàn tôi sạch.
toe|noun|/təʊ/|/toʊ/|A2|One of the five parts at the end of the foot.|ngón chân|I hit my toe on the table.|Tôi va ngón chân vào bàn.
heart|noun|/hɑːt/|/hɑːrt/|A1|The organ that pumps blood through your body.|trái tim|Running is good for the heart.|Chạy bộ tốt cho tim.
stomach|noun|/ˈstʌmək/|/ˈstʌmək/|A2|The organ where food is digested.|dạ dày|My stomach hurts after that meal.|Bụng tôi đau sau bữa đó.
blood|noun|/blʌd/|/blʌd/|A2|The red liquid that flows through the body.|máu|The doctor will test your blood.|Bác sĩ sẽ xét nghiệm máu.
bone|noun|/bəʊn/|/boʊn/|A2|A hard white part of the body.|xương|Milk helps build strong bones.|Sữa giúp xương chắc khoẻ.
skin|noun|/skɪn/|/skɪn/|A1|The outer covering of the body.|da|Use sunscreen to protect your skin.|Dùng kem chống nắng để bảo vệ da.
health|noun|/helθ/|/helθ/|A1|The condition of your body.|sức khoẻ|Health is more important than money.|Sức khoẻ quan trọng hơn tiền bạc.
medicine|noun|/ˈmedsɪn/|/ˈmedəsən/|A2|Something you take to treat illness.|thuốc|Take this medicine after meals.|Uống thuốc này sau bữa ăn.
pill|noun|/pɪl/|/pɪl/|A2|A small round piece of medicine.|viên thuốc|Take one pill every six hours.|Uống một viên mỗi sáu giờ.
hospital|noun|/ˈhɒspɪtəl/|/ˈhɑːspɪtəl/|A1|A place where sick people are treated.|bệnh viện|My aunt works in a hospital.|Cô tôi làm trong bệnh viện.
clinic|noun|/ˈklɪnɪk/|/ˈklɪnɪk/|B1|A small place that treats patients.|phòng khám|There is a new clinic in our area.|Có một phòng khám mới trong khu chúng tôi.
sick|adjective|/sɪk/|/sɪk/|A1|Not healthy.|ốm, bệnh|My son is sick today.|Hôm nay con trai tôi ốm.
ill|adjective|/ɪl/|/ɪl/|A2|Not feeling well; unhealthy.|bệnh|She has been ill for a week.|Cô ấy bệnh đã một tuần.
tired|adjective|/ˈtaɪəd/|/ˈtaɪərd/|A1|Feeling that you need to rest.|mệt|I'm too tired to go out tonight.|Tôi quá mệt để ra ngoài tối nay.
pain|noun|/peɪn/|/peɪn/|A2|An unpleasant feeling in the body.|đau|I feel a sharp pain in my back.|Tôi thấy đau nhói ở lưng.
headache|noun|/ˈhedeɪk/|/ˈhedeɪk/|A2|A pain in the head.|đau đầu|I have a headache from working too long.|Tôi đau đầu vì làm việc quá lâu.
fever|noun|/ˈfiːvə/|/ˈfiːvər/|A2|A higher than normal body temperature.|sốt|The child has a high fever.|Đứa trẻ bị sốt cao.
cough|noun|/kɒf/|/kɔːf/|A2|The action of sending air from the throat noisily.|ho|Take this syrup for your cough.|Uống si rô này để hết ho.
cold|noun|/kəʊld/|/koʊld/|A1|A common illness with a blocked nose.|cảm lạnh|I caught a cold last week.|Tuần trước tôi bị cảm lạnh.
flu|noun|/fluː/|/fluː/|B1|A common illness that causes fever and pain.|cúm|The flu can spread quickly.|Cúm có thể lây nhanh.
allergy|noun|/ˈælədʒi/|/ˈælərdʒi/|B1|A reaction of the body to a substance.|dị ứng|I have a peanut allergy.|Tôi bị dị ứng đậu phộng.
exercise|noun|/ˈeksəsaɪz/|/ˈeksərsaɪz/|A2|Physical activity to stay healthy.|tập thể dục|Daily exercise is important.|Tập thể dục mỗi ngày rất quan trọng.
strong|adjective|/strɒŋ/|/strɔːŋ/|A1|Having a lot of physical power.|khoẻ, mạnh|He is very strong.|Anh ấy rất khoẻ.
weak|adjective|/wiːk/|/wiːk/|A2|Not strong.|yếu|I feel weak when I'm hungry.|Tôi cảm thấy yếu khi đói.
healthy|adjective|/ˈhelθi/|/ˈhelθi/|A2|Good for your health.|tốt cho sức khoẻ|Eat a healthy breakfast.|Ăn bữa sáng tốt cho sức khoẻ.
breath|noun|/breθ/|/breθ/|B1|The air you take in and let out.|hơi thở|Take a deep breath.|Hít một hơi sâu.
finger|noun|/ˈfɪŋɡə/|/ˈfɪŋɡər/|A1|One of the five long parts of the hand.|ngón tay|My finger hurts.|Ngón tay tôi đau.
muscle|noun|/ˈmʌsəl/|/ˈmʌsəl/|B1|Tissue that moves the body.|cơ bắp|Stretch your muscles before running.|Khởi động cơ bắp trước khi chạy.
voice|noun|/vɔɪs/|/vɔɪs/|A2|The sound a person makes when speaking.|giọng|She has a beautiful voice.|Cô ấy có giọng hát đẹp.
brain|noun|/breɪn/|/breɪn/|B1|The organ inside the head that controls the body.|não|The brain needs sleep.|Não cần được ngủ.
patient|noun|/ˈpeɪʃənt/|/ˈpeɪʃənt/|B1|A person receiving medical care.|bệnh nhân|The patient is recovering well.|Bệnh nhân đang hồi phục tốt.
hurt|verb|/hɜːt/|/hɜːrt/|A2|To cause pain.|đau, làm đau|My back hurts.|Lưng tôi đau.
breathe|verb|/briːð/|/briːð/|B1|To take air in and out of the lungs.|hít thở|Breathe slowly and relax.|Thở chậm và thư giãn.
###5
city|noun|/ˈsɪti/|/ˈsɪti/|A1|A large town.|thành phố|Hanoi is a beautiful city.|Hà Nội là một thành phố đẹp.
country|noun|/ˈkʌntri/|/ˈkʌntri/|A1|An area of land with its own government.|đất nước|Vietnam is my country.|Việt Nam là đất nước của tôi.
village|noun|/ˈvɪlɪdʒ/|/ˈvɪlɪdʒ/|A2|A small group of houses in the countryside.|làng|My grandparents live in a village.|Ông bà tôi sống ở làng.
town|noun|/taʊn/|/taʊn/|A1|A place with houses and shops, smaller than a city.|thị trấn|We drove through a quiet town.|Chúng tôi lái xe qua một thị trấn yên tĩnh.
road|noun|/rəʊd/|/roʊd/|A1|A wide path for vehicles.|đường|This road leads to the beach.|Đường này dẫn ra biển.
street|noun|/striːt/|/striːt/|A1|A road in a town or city with buildings.|phố|We live on a busy street.|Chúng tôi sống trên một con phố đông đúc.
bridge|noun|/brɪdʒ/|/brɪdʒ/|A2|A structure built across a river or road.|cầu|Cross the bridge to reach the market.|Qua cầu là tới chợ.
river|noun|/ˈrɪvə/|/ˈrɪvər/|A1|A wide stream of water flowing to the sea.|sông|The river is calm this evening.|Dòng sông lặng yên chiều nay.
sea|noun|/siː/|/siː/|A1|A large area of salty water.|biển|The sea is warm in summer.|Biển ấm vào mùa hè.
beach|noun|/biːtʃ/|/biːtʃ/|A1|An area of sand by the sea.|bãi biển|We spend the weekend at the beach.|Chúng tôi nghỉ cuối tuần ở bãi biển.
mountain|noun|/ˈmaʊntɪn/|/ˈmaʊntən/|A1|A very high hill.|núi|Sapa is famous for its mountains.|Sa Pa nổi tiếng vì núi non.
forest|noun|/ˈfɒrɪst/|/ˈfɔːrɪst/|A2|A large area covered with trees.|rừng|We hiked through the forest.|Chúng tôi đi bộ qua rừng.
park|noun|/pɑːk/|/pɑːrk/|A1|A public area with grass and trees.|công viên|Children play in the park.|Trẻ em chơi ở công viên.
station|noun|/ˈsteɪʃən/|/ˈsteɪʃən/|A1|A place where buses or trains stop.|nhà ga, bến|We met at the train station.|Chúng tôi gặp nhau ở nhà ga.
airport|noun|/ˈeəpɔːt/|/ˈerpɔːrt/|A1|A place where aeroplanes land and take off.|sân bay|The airport is busy on Sundays.|Sân bay đông vào chủ nhật.
hotel|noun|/həʊˈtel/|/hoʊˈtel/|A1|A place where travellers stay.|khách sạn|The hotel is right by the sea.|Khách sạn ngay sát biển.
museum|noun|/mjuːˈziːəm/|/mjuːˈziːəm/|A2|A place where old or interesting objects are shown.|bảo tàng|We visited a war museum.|Chúng tôi đi thăm một bảo tàng chiến tranh.
shop|noun|/ʃɒp/|/ʃɑːp/|A1|A place where you buy things.|cửa hàng|There's a small shop on the corner.|Có một cửa hàng nhỏ ở góc phố.
market|noun|/ˈmɑːkɪt/|/ˈmɑːrkɪt/|A1|A place where many things are sold.|chợ|The market opens at five.|Chợ mở cửa lúc năm giờ.
bank|noun|/bæŋk/|/bæŋk/|A1|A place that keeps and lends money.|ngân hàng|I went to the bank this morning.|Tôi đi ngân hàng sáng nay.
ticket|noun|/ˈtɪkɪt/|/ˈtɪkɪt/|A1|A piece of paper that lets you enter or travel.|vé|Buy two tickets for the show.|Mua hai vé xem buổi diễn.
passport|noun|/ˈpɑːspɔːt/|/ˈpæspɔːrt/|A2|A document for travelling between countries.|hộ chiếu|Don't forget your passport.|Đừng quên hộ chiếu.
luggage|noun|/ˈlʌɡɪdʒ/|/ˈlʌɡɪdʒ/|A2|The bags you take when you travel.|hành lý|My luggage was very heavy.|Hành lý của tôi rất nặng.
journey|noun|/ˈdʒɜːni/|/ˈdʒɜːrni/|A2|An act of travelling from one place to another.|chuyến đi|It was a long journey.|Đó là một chuyến đi dài.
trip|noun|/trɪp/|/trɪp/|A1|A short journey.|chuyến đi ngắn|We took a trip to Phu Quoc.|Chúng tôi đi một chuyến tới Phú Quốc.
holiday|noun|/ˈhɒlɪdeɪ/|/ˈhɑːlədeɪ/|A1|A period when people do not work.|kỳ nghỉ|We had a great summer holiday.|Chúng tôi có kỳ nghỉ hè tuyệt vời.
tourist|noun|/ˈtʊərɪst/|/ˈtʊrɪst/|A2|A person travelling for fun.|khách du lịch|Tourists love Hoi An.|Khách du lịch yêu Hội An.
map|noun|/mæp/|/mæp/|A1|A drawing of a place from above.|bản đồ|Use the map to find the temple.|Dùng bản đồ để tìm ngôi đền.
bus|noun|/bʌs/|/bʌs/|A1|A large vehicle that carries many people.|xe buýt|The bus is late today.|Xe buýt hôm nay trễ.
train|noun|/treɪn/|/treɪn/|A1|A line of vehicles pulled by an engine.|tàu hoả|The train leaves at six in the morning.|Tàu rời ga lúc sáu giờ sáng.
taxi|noun|/ˈtæksi/|/ˈtæksi/|A1|A car you pay to take you somewhere.|tắc xi|Take a taxi if it rains.|Đi tắc xi nếu trời mưa.
car|noun|/kɑː/|/kɑːr/|A1|A vehicle with four wheels for a few people.|ô tô|My father's car is red.|Xe ô tô của bố tôi màu đỏ.
bike|noun|/baɪk/|/baɪk/|A1|A two-wheel vehicle you pedal.|xe đạp|I ride my bike to school.|Tôi đạp xe đi học.
motorbike|noun|/ˈməʊtəbaɪk/|/ˈmoʊtərbaɪk/|A2|A two-wheel vehicle with an engine.|xe máy|Motorbikes are everywhere in Saigon.|Xe máy đầy đường ở Sài Gòn.
plane|noun|/pleɪn/|/pleɪn/|A1|A vehicle that flies in the sky.|máy bay|Our plane lands at ten.|Máy bay của chúng tôi hạ cánh lúc mười giờ.
boat|noun|/bəʊt/|/boʊt/|A1|A small vehicle for travelling on water.|thuyền|We took a boat on the river.|Chúng tôi đi thuyền trên sông.
ship|noun|/ʃɪp/|/ʃɪp/|A2|A large boat for crossing the sea.|tàu thuỷ|The ship arrives at noon.|Tàu thuỷ tới lúc trưa.
arrive|verb|/əˈraɪv/|/əˈraɪv/|A1|To reach a place.|tới nơi|We arrive in Hue at noon.|Chúng tôi đến Huế lúc trưa.
depart|verb|/dɪˈpɑːt/|/dɪˈpɑːrt/|B1|To leave a place.|khởi hành|The flight departs at three.|Chuyến bay khởi hành lúc ba giờ.
visit|verb|/ˈvɪzɪt/|/ˈvɪzɪt/|A1|To go and see a person or place.|thăm|Let's visit my grandmother.|Chúng ta đi thăm bà nhé.
travel|verb|/ˈtrævəl/|/ˈtrævəl/|A1|To go from one place to another.|đi du lịch|We travel every summer.|Chúng tôi đi du lịch mỗi mùa hè.
stay|verb|/steɪ/|/steɪ/|A1|To remain in a place.|ở lại|We stayed at a beach hotel.|Chúng tôi ở khách sạn ven biển.
leave|verb|/liːv/|/liːv/|A1|To go away from a place.|rời đi|We leave for the airport at five.|Chúng tôi rời đi sân bay lúc năm giờ.
return|verb|/rɪˈtɜːn/|/rɪˈtɜːrn/|A2|To come back.|trở về|We return on Monday.|Chúng tôi trở về vào thứ hai.
suitcase|noun|/ˈsuːtkeɪs/|/ˈsuːtkeɪs/|A2|A bag with handles for travelling.|va li|My suitcase is too heavy.|Va li của tôi nặng quá.
backpack|noun|/ˈbækpæk/|/ˈbækpæk/|A2|A bag you carry on your back.|ba lô|Pack lightly in your backpack.|Sắp xếp gọn trong ba lô.
direction|noun|/dəˈrekʃən/|/dəˈrekʃən/|A2|The way you go to reach a place.|hướng đi|Could you give me directions?|Bạn chỉ đường giúp tôi được không?
abroad|adverb|/əˈbrɔːd/|/əˈbrɔːd/|B1|In or to another country.|nước ngoài|My sister studies abroad.|Chị tôi du học nước ngoài.
foreign|adjective|/ˈfɒrɪn/|/ˈfɔːrən/|B1|From another country.|nước ngoài, ngoại quốc|She learns three foreign languages.|Cô ấy học ba ngoại ngữ.
embassy|noun|/ˈembəsi/|/ˈembəsi/|B1|The office of a country's government in another country.|đại sứ quán|The embassy is closed on weekends.|Đại sứ quán đóng cửa cuối tuần.
###6
time|noun|/taɪm/|/taɪm/|A1|The thing measured in seconds, minutes, and hours.|thời gian|We don't have much time.|Chúng tôi không có nhiều thời gian.
hour|noun|/aʊə/|/aʊr/|A1|Sixty minutes.|giờ|The class is one hour long.|Lớp học dài một giờ.
minute|noun|/ˈmɪnɪt/|/ˈmɪnɪt/|A1|Sixty seconds.|phút|Wait one minute, please.|Chờ một phút nhé.
second|noun|/ˈsekənd/|/ˈsekənd/|A2|A short unit of time.|giây|It takes only a second.|Chỉ mất một giây.
day|noun|/deɪ/|/deɪ/|A1|A period of 24 hours.|ngày|Have a nice day.|Chúc một ngày tốt lành.
week|noun|/wiːk/|/wiːk/|A1|A period of seven days.|tuần|See you next week.|Hẹn gặp lại tuần sau.
month|noun|/mʌnθ/|/mʌnθ/|A1|A period of about 30 days.|tháng|My birthday is in the next month.|Sinh nhật tôi vào tháng sau.
year|noun|/jɪə/|/jɪr/|A1|A period of twelve months.|năm|This year passed quickly.|Năm nay trôi qua nhanh.
morning|noun|/ˈmɔːnɪŋ/|/ˈmɔːrnɪŋ/|A1|The early part of the day.|buổi sáng|I exercise in the morning.|Tôi tập thể dục buổi sáng.
afternoon|noun|/ˌɑːftəˈnuːn/|/ˌæftərˈnuːn/|A1|The part of the day after noon.|buổi chiều|We have a meeting in the afternoon.|Chúng tôi có cuộc họp vào buổi chiều.
evening|noun|/ˈiːvnɪŋ/|/ˈiːvnɪŋ/|A1|The early part of the night.|buổi tối|We watch films in the evening.|Chúng tôi xem phim buổi tối.
night|noun|/naɪt/|/naɪt/|A1|The time when it is dark.|đêm|Sleep well tonight.|Ngủ ngon đêm nay.
today|adverb|/təˈdeɪ/|/təˈdeɪ/|A1|On this day.|hôm nay|It is sunny today.|Hôm nay trời nắng.
yesterday|adverb|/ˈjestədeɪ/|/ˈjestərdeɪ/|A1|On the day before today.|hôm qua|We met yesterday.|Chúng tôi gặp nhau hôm qua.
tomorrow|adverb|/təˈmɒrəʊ/|/təˈmɔːroʊ/|A1|On the day after today.|ngày mai|See you tomorrow.|Hẹn gặp lại ngày mai.
now|adverb|/naʊ/|/naʊ/|A1|At this moment.|bây giờ|I'm reading a book now.|Bây giờ tôi đang đọc sách.
then|adverb|/ðen/|/ðen/|A1|At that time, or after that.|lúc đó, sau đó|We had tea, then we left.|Chúng tôi uống trà, rồi sau đó rời đi.
later|adverb|/ˈleɪtə/|/ˈleɪtər/|A1|After the time you are talking about.|sau đó|I'll call you later.|Lát nữa tôi sẽ gọi bạn.
early|adverb|/ˈɜːli/|/ˈɜːrli/|A1|Before the usual or expected time.|sớm|We arrived early.|Chúng tôi đến sớm.
late|adverb|/leɪt/|/leɪt/|A1|After the expected time.|trễ, muộn|Sorry I'm late.|Xin lỗi tôi đến muộn.
soon|adverb|/suːn/|/suːn/|A1|In a short time.|sớm thôi|Dinner will be ready soon.|Bữa tối sẽ sẵn sàng sớm thôi.
always|adverb|/ˈɔːlweɪz/|/ˈɔːlweɪz/|A1|Every time; on all occasions.|luôn luôn|She always smiles.|Cô ấy luôn cười.
never|adverb|/ˈnevə/|/ˈnevər/|A1|At no time.|không bao giờ|I never drink coffee at night.|Tôi không bao giờ uống cà phê buổi tối.
often|adverb|/ˈɒfən/|/ˈɔːfən/|A1|Many times.|thường|We often eat out on Fridays.|Chúng tôi thường ăn ngoài thứ sáu.
sometimes|adverb|/ˈsʌmtaɪmz/|/ˈsʌmtaɪmz/|A1|On some occasions.|đôi khi|I sometimes go for a run.|Đôi khi tôi đi chạy bộ.
usually|adverb|/ˈjuːʒəli/|/ˈjuːʒəli/|A2|Most of the time.|thường|I usually wake up at six.|Tôi thường thức dậy lúc sáu giờ.
rarely|adverb|/ˈreəli/|/ˈrerli/|B1|Not often.|hiếm khi|He rarely watches television.|Anh ấy hiếm khi xem ti vi.
weekend|noun|/ˌwiːkˈend/|/ˈwiːkend/|A1|Saturday and Sunday.|cuối tuần|We rest on the weekend.|Chúng tôi nghỉ ngơi cuối tuần.
date|noun|/deɪt/|/deɪt/|A1|A particular day of the month or year.|ngày tháng|What's today's date?|Hôm nay là ngày bao nhiêu?
season|noun|/ˈsiːzən/|/ˈsiːzən/|A2|One of the four parts of the year.|mùa|Spring is my favourite season.|Mùa xuân là mùa tôi thích nhất.
spring|noun|/sprɪŋ/|/sprɪŋ/|A1|The season after winter.|mùa xuân|Flowers bloom in spring.|Hoa nở vào mùa xuân.
summer|noun|/ˈsʌmə/|/ˈsʌmər/|A1|The warmest season.|mùa hè|We swim a lot in summer.|Chúng tôi bơi nhiều vào mùa hè.
autumn|noun|/ˈɔːtəm/|/ˈɔːtəm/|A2|The season between summer and winter.|mùa thu|Autumn leaves are beautiful.|Lá mùa thu thật đẹp.
winter|noun|/ˈwɪntə/|/ˈwɪntər/|A1|The coldest season.|mùa đông|It snows in winter.|Tuyết rơi vào mùa đông.
one|number|/wʌn/|/wʌn/|A1|The number 1.|một|I have one brother.|Tôi có một anh trai.
two|number|/tuː/|/tuː/|A1|The number 2.|hai|Two coffees, please.|Cho hai cà phê.
three|number|/θriː/|/θriː/|A1|The number 3.|ba|There are three apples.|Có ba quả táo.
four|number|/fɔː/|/fɔːr/|A1|The number 4.|bốn|My family has four people.|Gia đình tôi có bốn người.
five|number|/faɪv/|/faɪv/|A1|The number 5.|năm|We meet at five.|Chúng ta gặp nhau lúc năm giờ.
ten|number|/ten/|/ten/|A1|The number 10.|mười|Ten minutes is enough.|Mười phút là đủ.
hundred|number|/ˈhʌndrəd/|/ˈhʌndrəd/|A1|The number 100.|trăm|A hundred people came.|Một trăm người đã đến.
thousand|number|/ˈθaʊzənd/|/ˈθaʊzənd/|A1|The number 1,000.|nghìn|This costs a thousand dong.|Cái này một nghìn đồng.
million|number|/ˈmɪljən/|/ˈmɪljən/|A2|The number 1,000,000.|triệu|The city has eight million people.|Thành phố có tám triệu người.
half|noun|/hɑːf/|/hæf/|A1|One of two equal parts of something.|một nửa|Cut the apple in half.|Cắt quả táo làm đôi.
first|adjective|/fɜːst/|/fɜːrst/|A1|Coming before the others in time or order.|đầu tiên|This is my first lesson.|Đây là bài học đầu tiên của tôi.
last|adjective|/lɑːst/|/læst/|A1|Coming after all the others.|cuối cùng|This is the last chapter.|Đây là chương cuối.
quick|adjective|/kwɪk/|/kwɪk/|A1|Done in a short time.|nhanh|Have a quick look at this.|Xem nhanh cái này nhé.
slow|adjective|/sləʊ/|/sloʊ/|A1|Not moving fast.|chậm|The internet is slow today.|Hôm nay mạng chậm.
hour|noun|/aʊə/|/aʊr/|A1|Sixty minutes.|tiếng đồng hồ|It takes two hours to get there.|Mất hai tiếng để tới đó.
calendar|noun|/ˈkælɪndə/|/ˈkælɪndər/|A2|A page that shows the days of the year.|lịch|I marked the date on my calendar.|Tôi đánh dấu ngày này trên lịch.
###7
office|noun|/ˈɒfɪs/|/ˈɔːfɪs/|A1|A room or building where people work at desks.|văn phòng|My office is on the third floor.|Văn phòng tôi ở tầng ba.
job|noun|/dʒɒb/|/dʒɑːb/|A1|Work that you do for money.|công việc|She has a new job.|Cô ấy có công việc mới.
career|noun|/kəˈrɪə/|/kəˈrɪr/|B1|The work you do for many years.|sự nghiệp|He had a long career in design.|Anh ấy có sự nghiệp dài về thiết kế.
meeting|noun|/ˈmiːtɪŋ/|/ˈmiːtɪŋ/|A2|A planned gathering of people to talk.|cuộc họp|We have a meeting at ten.|Chúng tôi có cuộc họp lúc mười giờ.
project|noun|/ˈprɒdʒekt/|/ˈprɑːdʒekt/|B1|A planned piece of work with a goal.|dự án|Our project is due Friday.|Dự án của chúng tôi tới hạn thứ sáu.
deadline|noun|/ˈdedlaɪn/|/ˈdedlaɪn/|B1|A time by which work must be finished.|hạn chót|The deadline is at noon.|Hạn chót là vào trưa.
schedule|noun|/ˈʃedjuːl/|/ˈskedʒuːl/|B1|A plan of when things will happen.|lịch trình|My schedule is full this week.|Lịch của tôi tuần này kín.
report|noun|/rɪˈpɔːt/|/rɪˈpɔːrt/|B1|A written or spoken description.|báo cáo|Send the report by Tuesday.|Gửi báo cáo trước thứ ba.
email|noun|/ˈiːmeɪl/|/ˈiːmeɪl/|A1|A message sent over the internet.|email|I sent you an email yesterday.|Tôi đã gửi bạn email hôm qua.
document|noun|/ˈdɒkjʊmənt/|/ˈdɑːkjəmənt/|B1|A piece of paper or computer file with information.|tài liệu|Print three copies of the document.|In ba bản tài liệu.
contract|noun|/ˈkɒntrækt/|/ˈkɑːntrækt/|B1|A formal written agreement.|hợp đồng|Sign the contract here, please.|Vui lòng ký vào hợp đồng tại đây.
client|noun|/ˈklaɪənt/|/ˈklaɪənt/|B1|A person who buys services from a business.|khách hàng|Our client is happy.|Khách hàng của chúng tôi hài lòng.
customer|noun|/ˈkʌstəmə/|/ˈkʌstəmər/|A2|A person who buys goods or services.|khách|We treat every customer fairly.|Chúng tôi đối xử công bằng với mọi khách.
company|noun|/ˈkʌmpəni/|/ˈkʌmpəni/|A2|A business that makes or sells things.|công ty|The company has 200 employees.|Công ty có 200 nhân viên.
team|noun|/tiːm/|/tiːm/|A1|A group of people working together.|đội|My team finished the project early.|Đội tôi hoàn thành dự án sớm.
salary|noun|/ˈsæləri/|/ˈsæləri/|B1|Money paid for a job, usually monthly.|lương|Her salary increased this year.|Lương của cô ấy tăng năm nay.
interview|noun|/ˈɪntəvjuː/|/ˈɪntərvjuː/|B1|A meeting where someone is asked questions.|phỏng vấn|My interview is at 2 p.m.|Buổi phỏng vấn của tôi lúc 2 giờ chiều.
present|verb|/prɪˈzent/|/prɪˈzent/|B1|To show or explain something to others.|trình bày|I will present the plan tomorrow.|Tôi sẽ trình bày kế hoạch ngày mai.
manage|verb|/ˈmænɪdʒ/|/ˈmænɪdʒ/|B1|To be in charge of something.|quản lý|She manages a small team.|Cô ấy quản lý một đội nhỏ.
hire|verb|/haɪə/|/haɪər/|B1|To give someone a job.|tuyển dụng|We are hiring two new engineers.|Chúng tôi đang tuyển hai kỹ sư mới.
sign|verb|/saɪn/|/saɪn/|A2|To write your name on a document.|ký|Please sign here.|Vui lòng ký vào đây.
attend|verb|/əˈtend/|/əˈtend/|B1|To go to an event.|tham dự|I'll attend the conference next week.|Tôi sẽ tham dự hội nghị tuần sau.
discuss|verb|/dɪˈskʌs/|/dɪˈskʌs/|B1|To talk about something with others.|thảo luận|We discussed the budget today.|Hôm nay chúng tôi thảo luận về ngân sách.
agree|verb|/əˈɡriː/|/əˈɡriː/|A2|To have the same opinion.|đồng ý|We all agree with the plan.|Tất cả chúng tôi đồng ý với kế hoạch.
disagree|verb|/ˌdɪsəˈɡriː/|/ˌdɪsəˈɡriː/|B1|To have a different opinion.|không đồng ý|Some people disagree with this idea.|Vài người không đồng ý với ý tưởng này.
plan|noun|/plæn/|/plæn/|A1|A set of ideas about what to do.|kế hoạch|We made a plan for the weekend.|Chúng tôi lập kế hoạch cho cuối tuần.
goal|noun|/ɡəʊl/|/ɡoʊl/|B1|Something you hope to achieve.|mục tiêu|My goal is to speak English fluently.|Mục tiêu của tôi là nói tiếng Anh trôi chảy.
result|noun|/rɪˈzʌlt/|/rɪˈzʌlt/|A2|What happens because of something.|kết quả|The results were excellent.|Kết quả rất tốt.
opportunity|noun|/ˌɒpəˈtjuːnəti/|/ˌɑːpərˈtuːnəti/|B1|A chance to do something.|cơ hội|This is a great opportunity.|Đây là một cơ hội tuyệt vời.
challenge|noun|/ˈtʃælɪndʒ/|/ˈtʃælɪndʒ/|B1|Something difficult that tests you.|thách thức|Learning a new language is a challenge.|Học một ngôn ngữ mới là một thách thức.
budget|noun|/ˈbʌdʒɪt/|/ˈbʌdʒɪt/|B1|A plan for how to spend money.|ngân sách|We are over budget this month.|Chúng tôi vượt ngân sách tháng này.
profit|noun|/ˈprɒfɪt/|/ˈprɑːfɪt/|B2|Money earned beyond costs.|lợi nhuận|Profit grew by 20 percent.|Lợi nhuận tăng 20 phần trăm.
loss|noun|/lɒs/|/lɔːs/|B1|Money lost.|sự thua lỗ|The company reported a loss.|Công ty báo lỗ.
market|noun|/ˈmɑːkɪt/|/ˈmɑːrkɪt/|B1|The area or activity of buying and selling.|thị trường|The smartphone market is growing.|Thị trường điện thoại đang tăng trưởng.
product|noun|/ˈprɒdʌkt/|/ˈprɑːdəkt/|A2|Something that is made and sold.|sản phẩm|Our new product is selling well.|Sản phẩm mới của chúng tôi bán chạy.
service|noun|/ˈsɜːvɪs/|/ˈsɜːrvɪs/|A2|Work done for someone.|dịch vụ|The service was very professional.|Dịch vụ rất chuyên nghiệp.
quality|noun|/ˈkwɒləti/|/ˈkwɑːləti/|B1|How good or bad something is.|chất lượng|We care about quality.|Chúng tôi quan tâm đến chất lượng.
strategy|noun|/ˈstrætədʒi/|/ˈstrætədʒi/|B2|A plan for achieving a goal.|chiến lược|We need a new marketing strategy.|Chúng tôi cần một chiến lược tiếp thị mới.
data|noun|/ˈdeɪtə/|/ˈdeɪtə/|B1|Information used for decisions.|dữ liệu|We analyse the data each week.|Chúng tôi phân tích dữ liệu mỗi tuần.
feedback|noun|/ˈfiːdbæk/|/ˈfiːdbæk/|B1|Comments about how you did something.|phản hồi|Thanks for your feedback.|Cảm ơn phản hồi của bạn.
training|noun|/ˈtreɪnɪŋ/|/ˈtreɪnɪŋ/|B1|Lessons that teach a skill.|đào tạo|All new staff get training.|Tất cả nhân viên mới đều được đào tạo.
skill|noun|/skɪl/|/skɪl/|B1|The ability to do something well.|kỹ năng|Communication is an important skill.|Giao tiếp là một kỹ năng quan trọng.
experience|noun|/ɪkˈspɪəriəns/|/ɪkˈspɪriəns/|A2|Knowledge from doing something.|kinh nghiệm|She has ten years of experience.|Cô ấy có mười năm kinh nghiệm.
position|noun|/pəˈzɪʃən/|/pəˈzɪʃən/|B1|A job in a company.|vị trí|I applied for a new position.|Tôi nộp đơn cho vị trí mới.
department|noun|/dɪˈpɑːtmənt/|/dɪˈpɑːrtmənt/|B1|A part of a company that does specific work.|phòng ban|She works in the marketing department.|Cô ấy làm ở phòng marketing.
print|verb|/prɪnt/|/prɪnt/|A2|To make a copy on paper using a machine.|in|Print two copies of this.|In hai bản này nhé.
copy|verb|/ˈkɒpi/|/ˈkɑːpi/|A2|To make a duplicate of something.|sao chép|Copy these files to the server.|Sao chép các tệp này lên máy chủ.
deliver|verb|/dɪˈlɪvə/|/dɪˈlɪvər/|B1|To take something to a place.|giao hàng|We deliver across the city.|Chúng tôi giao hàng khắp thành phố.
register|verb|/ˈredʒɪstə/|/ˈredʒɪstər/|B1|To put your name on an official list.|đăng ký|Please register for the workshop.|Vui lòng đăng ký cho buổi hội thảo.
update|verb|/ʌpˈdeɪt/|/ʌpˈdeɪt/|B1|To make something more current.|cập nhật|Update the report by Friday.|Cập nhật báo cáo trước thứ sáu.
###8
happy|adjective|/ˈhæpi/|/ˈhæpi/|A1|Feeling joy or pleasure.|vui|I'm happy to see you.|Tôi rất vui khi gặp bạn.
sad|adjective|/sæd/|/sæd/|A1|Feeling unhappy.|buồn|She felt sad when her cat left.|Cô ấy buồn khi mèo của cô bỏ đi.
angry|adjective|/ˈæŋɡri/|/ˈæŋɡri/|A1|Feeling upset and annoyed.|tức giận|Don't be angry with me.|Đừng giận tôi.
excited|adjective|/ɪkˈsaɪtɪd/|/ɪkˈsaɪtɪd/|A2|Feeling very happy and full of energy.|hào hứng|I'm excited about the trip.|Tôi hào hứng về chuyến đi.
nervous|adjective|/ˈnɜːvəs/|/ˈnɜːrvəs/|A2|Feeling worried about something that will happen.|hồi hộp|She was nervous before the exam.|Cô ấy hồi hộp trước kỳ thi.
worried|adjective|/ˈwʌrid/|/ˈwɜːrid/|A2|Feeling unhappy because something might be wrong.|lo lắng|My mother is worried about the rain.|Mẹ tôi lo lắng về cơn mưa.
afraid|adjective|/əˈfreɪd/|/əˈfreɪd/|A2|Feeling fear.|sợ|I'm afraid of heights.|Tôi sợ độ cao.
surprised|adjective|/səˈpraɪzd/|/sərˈpraɪzd/|A2|Feeling something unusual has happened.|ngạc nhiên|We were surprised by the gift.|Chúng tôi rất ngạc nhiên về món quà.
proud|adjective|/praʊd/|/praʊd/|B1|Feeling pleased about something you did.|tự hào|I'm proud of my students.|Tôi tự hào về học trò của mình.
ashamed|adjective|/əˈʃeɪmd/|/əˈʃeɪmd/|B1|Feeling bad about something you did.|xấu hổ|He felt ashamed of his mistake.|Anh ấy xấu hổ về sai lầm của mình.
bored|adjective|/bɔːd/|/bɔːrd/|A2|Feeling tired because nothing is interesting.|chán|I'm bored at home today.|Hôm nay tôi chán ở nhà.
lonely|adjective|/ˈləʊnli/|/ˈloʊnli/|B1|Sad because you are alone.|cô đơn|Living alone can feel lonely.|Sống một mình có thể thấy cô đơn.
funny|adjective|/ˈfʌni/|/ˈfʌni/|A1|Making people laugh.|hài hước|That joke is funny.|Câu chuyện cười đó hay quá.
serious|adjective|/ˈsɪəriəs/|/ˈsɪriəs/|A2|Not joking; thoughtful.|nghiêm túc|This is a serious problem.|Đây là một vấn đề nghiêm túc.
kind|adjective|/kaɪnd/|/kaɪnd/|A1|Friendly and helpful.|tốt bụng|My neighbour is very kind.|Hàng xóm tôi rất tốt bụng.
friendly|adjective|/ˈfrendli/|/ˈfrendli/|A1|Behaving in a pleasant way to others.|thân thiện|The staff are friendly here.|Nhân viên ở đây rất thân thiện.
shy|adjective|/ʃaɪ/|/ʃaɪ/|A2|Not comfortable around new people.|nhút nhát|She is shy with strangers.|Cô ấy nhút nhát với người lạ.
brave|adjective|/breɪv/|/breɪv/|A2|Showing no fear.|dũng cảm|He is a brave young man.|Anh ấy là chàng trai dũng cảm.
honest|adjective|/ˈɒnɪst/|/ˈɑːnɪst/|A2|Always telling the truth.|trung thực|Honest people are trusted.|Người trung thực được tin tưởng.
polite|adjective|/pəˈlaɪt/|/pəˈlaɪt/|A2|Showing respect for others.|lịch sự|She is always polite to elders.|Cô ấy luôn lịch sự với người lớn tuổi.
rude|adjective|/ruːd/|/ruːd/|A2|Not polite.|thô lỗ|It's rude to interrupt.|Ngắt lời người khác là thô lỗ.
quiet|adjective|/ˈkwaɪət/|/ˈkwaɪət/|A1|Making little noise.|yên tĩnh|The library is quiet.|Thư viện yên tĩnh.
clever|adjective|/ˈklevə/|/ˈklevər/|A2|Quick to learn and understand.|thông minh|That child is very clever.|Đứa trẻ đó rất thông minh.
smart|adjective|/smɑːt/|/smɑːrt/|A2|Intelligent.|thông minh|She is a smart student.|Cô ấy là một học sinh thông minh.
lazy|adjective|/ˈleɪzi/|/ˈleɪzi/|A2|Not wanting to work.|lười|Don't be lazy about exercise.|Đừng lười tập thể dục.
beautiful|adjective|/ˈbjuːtɪfəl/|/ˈbjuːtɪfəl/|A1|Very pleasing to look at.|đẹp|Hue is a beautiful city.|Huế là một thành phố đẹp.
ugly|adjective|/ˈʌɡli/|/ˈʌɡli/|A2|Not pleasing to look at.|xấu xí|These shoes are a bit ugly.|Đôi giày này hơi xấu.
easy|adjective|/ˈiːzi/|/ˈiːzi/|A1|Not hard to do.|dễ|This question is easy.|Câu hỏi này dễ.
difficult|adjective|/ˈdɪfɪkəlt/|/ˈdɪfɪkəlt/|A1|Not easy to do.|khó|Math is difficult for some students.|Toán khó với một số học sinh.
interesting|adjective|/ˈɪntrəstɪŋ/|/ˈɪntrəstɪŋ/|A1|Something that attracts attention.|thú vị|That movie was interesting.|Bộ phim đó rất thú vị.
boring|adjective|/ˈbɔːrɪŋ/|/ˈbɔːrɪŋ/|A1|Not interesting.|chán|The lecture was boring.|Bài giảng chán.
important|adjective|/ɪmˈpɔːtənt/|/ɪmˈpɔːrtənt/|A1|Necessary or special.|quan trọng|Family is important to me.|Gia đình rất quan trọng với tôi.
useful|adjective|/ˈjuːsfəl/|/ˈjuːsfəl/|A2|Helpful for a purpose.|hữu ích|This app is very useful.|Ứng dụng này rất hữu ích.
useless|adjective|/ˈjuːsləs/|/ˈjuːsləs/|B1|Not helpful at all.|vô dụng|This pen is useless.|Cây bút này vô dụng.
right|adjective|/raɪt/|/raɪt/|A1|Correct or true.|đúng|Your answer is right.|Câu trả lời của bạn đúng.
wrong|adjective|/rɒŋ/|/rɔːŋ/|A1|Not correct.|sai|That answer is wrong.|Câu trả lời đó sai.
good|adjective|/ɡʊd/|/ɡʊd/|A1|Of high quality or pleasant.|tốt|This is a good idea.|Đây là một ý hay.
bad|adjective|/bæd/|/bæd/|A1|Of low quality or unpleasant.|tệ|That food tasted bad.|Thức ăn đó dở.
nice|adjective|/naɪs/|/naɪs/|A1|Pleasant or kind.|tốt, dễ chịu|That was a nice surprise.|Đó là một bất ngờ thú vị.
new|adjective|/njuː/|/nuː/|A1|Not existing before; recent.|mới|I bought a new phone.|Tôi mới mua điện thoại.
old|adjective|/əʊld/|/oʊld/|A1|Existing for a long time; not young.|cũ, già|My grandfather is old.|Ông tôi đã già.
young|adjective|/jʌŋ/|/jʌŋ/|A1|Not old; having lived for a short time.|trẻ|She looks very young.|Cô ấy trông rất trẻ.
big|adjective|/bɪɡ/|/bɪɡ/|A1|Of large size.|to lớn|This is a big house.|Đây là một căn nhà lớn.
small|adjective|/smɔːl/|/smɔːl/|A1|Of little size.|nhỏ|My phone has a small screen.|Điện thoại tôi có màn hình nhỏ.
long|adjective|/lɒŋ/|/lɔːŋ/|A1|Having great length.|dài|It was a long meeting.|Cuộc họp dài.
short|adjective|/ʃɔːt/|/ʃɔːrt/|A1|Not long.|ngắn|We had a short break.|Chúng tôi có một nghỉ giải lao ngắn.
high|adjective|/haɪ/|/haɪ/|A1|At a great distance from the ground.|cao|The shelf is too high.|Cái kệ cao quá.
low|adjective|/ləʊ/|/loʊ/|A1|Close to the ground.|thấp|The chair is too low.|Cái ghế thấp quá.
heavy|adjective|/ˈhevi/|/ˈhevi/|A1|Difficult to lift.|nặng|This box is too heavy.|Cái hộp này nặng quá.
light|adjective|/laɪt/|/laɪt/|A1|Easy to lift.|nhẹ|This bag is very light.|Cái túi này rất nhẹ.
###9
sky|noun|/skaɪ/|/skaɪ/|A1|The space above the earth.|bầu trời|The sky is clear tonight.|Bầu trời trong đêm nay.
sun|noun|/sʌn/|/sʌn/|A1|The star that gives us light and heat.|mặt trời|The sun is hot today.|Mặt trời gay gắt hôm nay.
moon|noun|/muːn/|/muːn/|A1|The bright object in the night sky.|mặt trăng|The moon is full tonight.|Trăng tròn đêm nay.
star|noun|/stɑː/|/stɑːr/|A1|A small bright point of light in the night sky.|ngôi sao|We can see many stars tonight.|Chúng ta thấy nhiều ngôi sao tối nay.
cloud|noun|/klaʊd/|/klaʊd/|A1|A white or grey object in the sky.|mây|Dark clouds mean rain.|Mây đen báo trời sẽ mưa.
rain|noun|/reɪn/|/reɪn/|A1|Water that falls from the sky.|mưa|We need rain for the rice fields.|Chúng tôi cần mưa cho ruộng lúa.
snow|noun|/snəʊ/|/snoʊ/|A1|Soft white pieces of frozen water from the sky.|tuyết|It snows in the mountains.|Tuyết rơi trên núi.
wind|noun|/wɪnd/|/wɪnd/|A1|Moving air.|gió|There's a strong wind today.|Hôm nay có gió mạnh.
storm|noun|/stɔːm/|/stɔːrm/|A2|Very bad weather with strong winds.|bão|A storm is coming.|Một cơn bão đang đến.
thunder|noun|/ˈθʌndə/|/ˈθʌndər/|B1|The loud sound from a storm.|sấm|We heard thunder all night.|Chúng tôi nghe sấm cả đêm.
lightning|noun|/ˈlaɪtnɪŋ/|/ˈlaɪtnɪŋ/|B1|A flash of bright light in a storm.|chớp|Don't go outside during lightning.|Đừng ra ngoài khi có sét.
weather|noun|/ˈweðə/|/ˈweðər/|A1|The condition of the air.|thời tiết|The weather is nice today.|Thời tiết hôm nay đẹp.
temperature|noun|/ˈtemprətʃə/|/ˈtemprətʃər/|A2|How hot or cold something is.|nhiệt độ|The temperature is 30 degrees.|Nhiệt độ là 30 độ.
hot|adjective|/hɒt/|/hɑːt/|A1|At a high temperature.|nóng|It's very hot today.|Hôm nay rất nóng.
warm|adjective|/wɔːm/|/wɔːrm/|A1|Slightly hot in a pleasant way.|ấm|The blanket is warm.|Cái chăn ấm.
cool|adjective|/kuːl/|/kuːl/|A1|Slightly cold; pleasant.|mát|The air is cool tonight.|Không khí mát mẻ đêm nay.
cold|adjective|/kəʊld/|/koʊld/|A1|At a low temperature.|lạnh|It's cold in winter.|Mùa đông trời lạnh.
dry|adjective|/draɪ/|/draɪ/|A2|Without water.|khô|The clothes are dry now.|Quần áo khô rồi.
wet|adjective|/wet/|/wet/|A2|Covered with water.|ướt|My shoes are wet.|Giày tôi ướt.
flower|noun|/ˈflaʊə/|/ˈflaʊər/|A1|The colourful part of a plant.|hoa|She bought yellow flowers.|Cô ấy mua hoa vàng.
tree|noun|/triː/|/triː/|A1|A large plant with a trunk and branches.|cây|This tree is hundreds of years old.|Cây này hàng trăm năm tuổi.
leaf|noun|/liːf/|/liːf/|A2|A flat green part of a plant.|lá|Leaves fall in autumn.|Lá rụng vào mùa thu.
grass|noun|/ɡrɑːs/|/ɡræs/|A1|Short green plants that cover the ground.|cỏ|Children love playing on the grass.|Trẻ em thích chơi trên cỏ.
plant|noun|/plɑːnt/|/plænt/|A1|A living thing that grows from the ground.|cây cối|My mother grows plants on the balcony.|Mẹ tôi trồng cây trên ban công.
animal|noun|/ˈænɪməl/|/ˈænɪməl/|A1|A living thing that can move; not a plant.|động vật|We saw many animals at the zoo.|Chúng tôi thấy nhiều động vật ở sở thú.
dog|noun|/dɒɡ/|/dɔːɡ/|A1|A common pet that barks.|con chó|My dog is very friendly.|Con chó của tôi rất thân thiện.
cat|noun|/kæt/|/kæt/|A1|A small pet with fur and a tail.|con mèo|The cat is sleeping on the chair.|Con mèo đang ngủ trên ghế.
bird|noun|/bɜːd/|/bɜːrd/|A1|An animal with feathers that can usually fly.|chim|Birds sing in the morning.|Chim hót vào buổi sáng.
horse|noun|/hɔːs/|/hɔːrs/|A1|A large animal people ride.|ngựa|Children love seeing horses.|Trẻ em thích nhìn ngựa.
cow|noun|/kaʊ/|/kaʊ/|A1|A large farm animal that gives milk.|bò|The cow is in the field.|Con bò đang ở trên đồng.
pig|noun|/pɪɡ/|/pɪɡ/|A1|A farm animal kept for meat.|heo|The farmer feeds the pigs.|Người nông dân cho heo ăn.
sheep|noun|/ʃiːp/|/ʃiːp/|A2|A farm animal kept for wool.|cừu|White sheep are on the hill.|Cừu trắng trên đồi.
chicken|noun|/ˈtʃɪkɪn/|/ˈtʃɪkɪn/|A1|A bird kept for meat and eggs.|gà|Our chickens lay eggs every day.|Gà nhà tôi đẻ trứng mỗi ngày.
fish|noun|/fɪʃ/|/fɪʃ/|A1|An animal that lives in water.|cá|Fish need clean water.|Cá cần nước sạch.
butterfly|noun|/ˈbʌtəflaɪ/|/ˈbʌtərflaɪ/|A2|An insect with large colourful wings.|bướm|Butterflies love the garden.|Bướm thích khu vườn.
bee|noun|/biː/|/biː/|A2|A small insect that makes honey.|ong|Bees help flowers grow.|Ong giúp hoa nở.
spider|noun|/ˈspaɪdə/|/ˈspaɪdər/|A2|A small animal with eight legs.|nhện|There is a spider on the wall.|Có một con nhện trên tường.
land|noun|/lænd/|/lænd/|A2|The solid part of the earth's surface.|đất|This land belongs to the village.|Mảnh đất này thuộc về làng.
ground|noun|/ɡraʊnd/|/ɡraʊnd/|A2|The surface of the earth.|mặt đất|The ground is wet.|Mặt đất ướt.
hill|noun|/hɪl/|/hɪl/|A2|A raised area of land smaller than a mountain.|đồi|We climbed a small hill.|Chúng tôi leo lên một quả đồi nhỏ.
lake|noun|/leɪk/|/leɪk/|A1|A large area of water surrounded by land.|hồ|Hoan Kiem Lake is famous.|Hồ Hoàn Kiếm nổi tiếng.
ocean|noun|/ˈəʊʃən/|/ˈoʊʃən/|A2|A very large area of salty water.|đại dương|The Pacific Ocean is huge.|Thái Bình Dương rất rộng lớn.
island|noun|/ˈaɪlənd/|/ˈaɪlənd/|A2|A piece of land surrounded by water.|đảo|Phu Quoc is a beautiful island.|Phú Quốc là một hòn đảo đẹp.
desert|noun|/ˈdezət/|/ˈdezərt/|B1|A dry area with little rain.|sa mạc|The desert is hot during the day.|Sa mạc rất nóng vào ban ngày.
jungle|noun|/ˈdʒʌŋɡəl/|/ˈdʒʌŋɡəl/|B1|A thick tropical forest.|rừng nhiệt đới|Many animals live in the jungle.|Nhiều loài vật sống trong rừng.
nature|noun|/ˈneɪtʃə/|/ˈneɪtʃər/|A2|Plants, animals, and the natural environment.|thiên nhiên|We should protect nature.|Chúng ta nên bảo vệ thiên nhiên.
sunny|adjective|/ˈsʌni/|/ˈsʌni/|A1|Having a lot of sun.|nắng|It's a sunny morning.|Buổi sáng nắng.
cloudy|adjective|/ˈklaʊdi/|/ˈklaʊdi/|A2|Covered with clouds.|nhiều mây|It looks cloudy today.|Hôm nay nhiều mây.
rainy|adjective|/ˈreɪni/|/ˈreɪni/|A1|Having a lot of rain.|mưa nhiều|Bring an umbrella; it's a rainy day.|Mang ô vì hôm nay mưa nhiều.
windy|adjective|/ˈwɪndi/|/ˈwɪndi/|A1|Having a lot of wind.|gió nhiều|It is too windy for the boat.|Gió quá mạnh không thể đi thuyền.
foggy|adjective|/ˈfɒɡi/|/ˈfɔːɡi/|B1|Full of fog; hard to see through.|sương mù|The morning is foggy.|Buổi sáng có sương mù.
`;

// ── Parser ──────────────────────────────────────────────────────────────────

const decks = {};
let currentDeckIdx = null;
let totalWords = 0;
let frequencyRank = 0;
const seenHeadwords = new Set();
const words = [];

for (const rawLine of RAW.split("\n")) {
  const line = rawLine.trim();
  if (!line) continue;
  if (line.startsWith("###")) {
    currentDeckIdx = Number(line.slice(3));
    continue;
  }
  if (currentDeckIdx === null) continue;
  const parts = line.split("|");
  if (parts.length < 9) {
    console.warn(`Skipping malformed line: ${line}`);
    continue;
  }
  const [headword, pos, ipaUk, ipaUs, cefr, defEn, defVi, exEn, exVi] =
    parts.map((p) => p.trim());

  // Skip duplicate headwords across decks (last one wins on data, first deck wins on assignment)
  if (seenHeadwords.has(headword)) {
    // Append additional deck association to the existing entry
    const existing = words.find((w) => w.headword === headword);
    const deckSlug = DECK_SLUGS[currentDeckIdx];
    if (existing && !existing.deck_slugs.includes(deckSlug)) {
      existing.deck_slugs.push(deckSlug);
    }
    continue;
  }
  seenHeadwords.add(headword);

  frequencyRank += 1;
  const entryType =
    pos === "phrase"
      ? "phrase"
      : pos === "phrasal_verb"
        ? "phrasal_verb"
        : "word";

  words.push({
    headword,
    type: entryType,
    review_status: "verified",
    part_of_speech: pos,
    ipa_uk: ipaUk || null,
    ipa_us: ipaUs || null,
    frequency_rank: frequencyRank,
    cefr_level: cefr,
    deck_slugs: [DECK_SLUGS[currentDeckIdx]],
    senses: [
      {
        sense_index: 0,
        definition_en: defEn,
        definition_vi: defVi,
        register: "common",
        domain: DECKS[currentDeckIdx].name.toLowerCase(),
        examples: [
          {
            sentence_en: exEn,
            sentence_vi: exVi,
          },
        ],
      },
    ],
  });
  totalWords += 1;
}

const output = {
  pack: PACK,
  decks: DECKS,
  words,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(
  `Wrote ${OUT}: ${words.length} words across ${DECKS.length} decks.`,
);
