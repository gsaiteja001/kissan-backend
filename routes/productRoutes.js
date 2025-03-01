
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../modal/product');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addReview,
  getProductInventory,
  updateVariants,
  getAllUniqueCategories,
} = require('../controllers/productController');

const { getDeliveryInfo } = require('../controllers/calculateEstimateTimeStock');


const router = express.Router();


router.get('/estimateDelivery', getDeliveryInfo);

// List of users categorized by regions
const users = {
  'Andhra Pradesh': [
    'Rajasekhar Reddy', 'Venkata Ramana', 'Harikrishna Babu', 'Chaitanya Rao', 'Padmavathi Devi', 'Sreeja Reddy', 'Bhanu Prakash', 'Anjaneya Sharma', 'Narasimha Murthy', 'Lalitha Kumari', 
    'Uday Kiran', 'Nithya Priya', 'Srinivasa Rao', 'Pavan Kumar', 'Mahesh Babu', 'Shyam Sundar', 'Sharvani Devi', 'Venkatadri Naidu', 'Satyanarayana Reddy', 'Ramachandra Prasad'
  ],
  'Tamil Nadu': [
    'Arvind Subramanian', 'Gopinathan Iyer', 'Venkatesh Prabhu', 'Janani Lakshmi', 'Meenakshi Sundaram', 'Sridharan Mani', 'Rajalakshmi Devi', 'Balasubramaniam', 'Dharmaraj Sekar', 
    'Karthikeyan Muthu', 'Anbu Chelvan', 'Prabhavathi Devi', 'Senthil Kumaran', 'Ramya Krishnan', 'Vignesh Swaminathan', 'Malathi Vaidyanathan', 'Kumaran Sethuraman', 'Aishwarya Shankar', 
    'Somasundaram Pillai', 'Goutham Krishnan'
  ],
  'West Bengal': [
    'Anirban Chatterjee', 'Saurav Mukherjee', 'Debashree Sen', 'Anindita Dutta', 'Subhrajit Bose', 'Ranjan Bhattacharya', 'Tapaswini Banerjee', 'Rituparna Dasgupta', 'Soumitra Roy', 
    'Biplab Ghosh', 'Priyanka Chakraborty', 'Paromita Sarkar', 'Abhijit Sen', 'Rajarshi Sinha', 'Moushumi Chattopadhyay', 'Nandini Majumdar', 'Sujoy Mitra', 'Sayantika Basu', 
    'Pradipta Lahiri', 'Swagata Mukhopadhyay'
  ],
  'Maharashtra': [
    'Rohan Deshpande', 'Shubham Jadhav', 'Aditi Kulkarni', 'Sandeep Patil', 'Tanmay Bhosale', 'Vaishnavi Apte', 'Sameer Joshi', 'Suhasini Phadnis', 'Amol Sathe', 'Pranav Gokhale', 
    'Akanksha Modak', 'Tejaswini Pawar', 'Omkar Khedekar', 'Kunal Bapat', 'Swapnil More', 'Rutuja Sawant', 'Madhuri Thakre', 'Anirudh Karmarkar', 'Yogesh Jagtap', 'Manasi Deshmukh'
  ],
  'Christian Names': [
    'Thomas Mathews', 'Peter Rodrigues', 'Maria Josephine', 'Jonathan D’Cruz', 'Rebecca Francis', 'Paul Sebastian', 'Grace Monteiro', 'Daniel Gomes', 'Michael D’Souza', 
    'Christopher Fernandes', 'Angela Pereira', 'David Pinto', 'Clara Rozario', 'Veronica Noronha', 'Alex Sequeira', 'Teresa Fernandes', 'Raymond Lobo', 'Samuel Gonsalves', 
    'Sylvia Mendonca', 'Mark Almeida'
  ],
  'Punjabi/Sikh Names': [
    'Harpreet Singh', 'Simran Kaur', 'Gurpreet Singh', 'Manjit Kaur', 'Jaswinder Singh', 'Sukhdev Kaur', 'Hardeep Singh', 'Navneet Kaur', 'Prabhjot Singh', 'Amandeep Kaur', 
    'Kulwinder Singh', 'Paramjeet Kaur', 'Baljinder Singh', 'Rajdeep Kaur', 'Jagmohan Singh', 'Ravneet Kaur', 'Satinderpal Singh', 'Charanjit Kaur', 'Tejinder Singh', 'Kirandeep Kaur'
  ],
  'Gujarati Names': [
    'Hitesh Patel', 'Bhavik Mehta', 'Jignesh Shah', 'Urmila Bhatt', 'Pranav Gandhi', 'Niyati Desai', 'Manish Trivedi', 'Hemant Vora', 'Krishna Solanki', 'Snehal Parekh', 
    'Dinesh Gohil', 'Komal Shah', 'Chirag Choksi', 'Dhruv Dave', 'Hetal Joshi', 'Mayur Rawal', 'Rupal Shah', 'Parth Bhatt', 'Bhavna Doshi', 'Sanjay Jadeja'
  ],
  'Karnataka/Kannadiga Names': [
    'Ramesh Gowda', 'Shruthi Narayan', 'Vikas Hegde', 'Manjunath Rao', 'Kavya Desai', 'Sandeep Patil', 'Swetha Shastri', 'Rajesh Iyer', 'Raghavendra Naik', 'Meghana Kulkarni', 
    'Naveen Krishna', 'Anjali Shetty', 'Gopal Srinivas', 'Pradeep Bhat', 'Revathi Rao', 'Kiran Kumar', 'Lavanya Iyengar', 'Yogesh Shenoy', 'Shravan Murthy', 'Keerthana Acharya'
  ],
  'Muslim Names': [
    'Mohammad Arshad', 'Ayesha Siddiqui', 'Farhan Khan', 'Nasreen Jahan', 'Imran Qureshi', 'Sana Fatima', 'Tariq Anwar', 'Fiza Rahman', 'Rehan Ahmed', 'Nargis Bano', 
    'Zeeshan Malik', 'Lubna Parveen', 'Arif Shaikh', 'Shabana Begum', 'Javed Akhtar', 'Mehjabeen Hussain', 'Salman Ansari', 'Yasmin Bano', 'Faizan Sheikh', 'Iqbal Mirza'
  ],
  'North-East Indian Names': [
    'Lalmuanpuia Khiangte', 'Aizawl Hmar', 'Tenzing Lepcha', 'Pem Dorji', 'Bamang Tago', 'Nyamar Karbak', 'Athikho Rengma', 'Meizokhrielie Therie', 'Ranjit Nongrum', 
    'Pynshngain Syiem', 'Krishna Chetri', 'Dipankar Deka', 'Hanghal Touthang', 'Thangboi Kipgen', 'Anamika Debbarma', 'Binoy Bhattacharjee', 'Sonam Bhutia', 'Dorjee Lama', 
    'Thangzalam Gangte', 'Lalremruata Fanai'
  ]
};

// List of multilingual comments
const comments = {
  'Hindi': [
    'Bilkul asli maal! Itne kam daam me aur kahin nahi milega! 😍', 
    'Samay par delivery hui, packaging bhi badiya thi! Bahut accha laga! 🚚', 
    'Pehli baar online kharida tha, par yakeen mano asli aur sasta nikla! 👌',
    'Itni fast delivery! Gaon tak bhi 3 din me pahunch gaya! 👏',
    'Sahi daam, asli quality, aur zabardast service! Bahut khush hoon! 💯'
  ],
  'Tamil': [
    'மிகவும் உண்மையான பொருட்கள், நல்ல தரம், மலிவு விலை! 👌',
    'விரைவான டெலிவரி! மொத்தமாக நல்ல அனுபவம்! 🚚',
    'இது முதல் முறையாக ஆர்டர் செய்தேன், ஆனால் தரம் அருமை! 💯',
    'நம்பிக்கைக்குரிய சேவை, குறைந்த விலையில் சிறந்த பொருள்! 🙌',
    'மிக விரைவாக வந்து சேர்ந்தது! இது தான் தேவையான சர்வீஸ்! 😍'
  ],
  'Telugu': [
    'అసలు ప్రామాణికతే! తక్కువ ధరలో గొప్ప నాణ్యత! 👏',
    'డెలివరీ చాలా వేగంగా వచ్చింది! కస్టమర్ సర్వీస్ బావుంది! 🚚',
    'ఇంత తక్కువ ధరలో ఇంత మంచి క్వాలిటీ ఆశించలేదు! అద్భుతం! 💯',
    'నిజమైన, నమ్మదగిన కంపెనీ, మళ్ళీ ఇక్కడే కొనుగోలు చేస్తాను! 🤩',
    'గ్రామాలకు కూడా త్వరగా డెలివరీ చేశారు, అభినందనలు! 👌'
  ],
  'Bengali': [
    'একদম আসল জিনিস! এই দামে এমন কিছু পাওয়া যায় না! 😍',
    'ডেলিভারিটা খুব দ্রুত ছিল, প্যাকেজিংও ভালো! 🚚',
    'নির্ভরযোগ্য সার্ভিস, সস্তা ও ভালো! 👌',
    'প্রথমবার কিনলাম, সত্যিই অসাধারণ অভিজ্ঞতা! 💯',
    'সময়ের মধ্যে হাতে পেলাম, একেবারে পারফেক্ট! 🎉'
  ],
  'Marathi': [
    'मूळ दर्जेदार वस्तू! कमी किमतीत जबरदस्त सौदा! 😍',
    'अतिशय वेगवान डिलिव्हरी, ग्रामीण भागातही वेळेवर मिळाले! 🚚',
    'पहिल्यांदा घेतले पण प्रामाणिक आणि स्वस्त निघाले! 🙌',
    'खरंच उत्तम सेवा, पुन्हा इथूनच खरेदी करीन! 💯',
    'आश्चर्यकारक सेवा, वस्तूची गुणवत्ता अप्रतिम! 👏'
  ],
  'Punjabi': [
    'ਇੱਕ ਦਮ ਖਰੀ ਸਰਵਿਸ! ਜਿਨੀ ਤਕੜੀ ਕੁਆਲਟੀ, ਓਨੀ ਘੱਟ ਕੀਮਤ! 😍',
    'ਪਹਿਲੀ ਵਾਰ ਆਰਡਰ ਕੀਤਾ, ਪਰ ਗੱਲ ਬਹੁਤ ਵਧੀਆ ਨਿਕਲੀ! 💯',
    'ਬਹੁਤ ਹੀ ਤੇਜ਼ ਡਿਲਿਵਰੀ, 2 ਦਿਨ ਚ ਹੀ ਪਹੁੰਚ ਗਿਆ! 🚚',
    'ਸਚਮੁਚ ਭਰੋਸੇਯੋਗ, ਘੱਟ ਕੀਮਤ ਤੇ ਜ਼ਬਰਦਸਤ ਚੀਜ਼! 👌',
    'ਗ੍ਰਾਮਾਂ ਤੱਕ ਵੀ ਬੇਮਿਸਾਲ ਸਰਵਿਸ, ਸ਼ਾਨਦਾਰ! 🎉'
  ]
};

// Function to generate random review
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate reviews for all products
router.put('/generate-reviews', async (req, res) => {
  try {
    const products = await Product.find(); // Fetch all products from the database
    
    if (!products || products.length === 0) {
      console.log('No products found');
      return;
    }

    for (const product of products) {
      // Generate 6-7 distinct reviews for each product
      const reviews = [];
      for (let i = 0; i < 6 + Math.floor(Math.random() * 2); i++) { // 6 to 7 reviews
        const randomRegion = Object.keys(users)[Math.floor(Math.random() * Object.keys(users).length)];
        const user = users[randomRegion][Math.floor(Math.random() * users[randomRegion].length)];
        const rating = getRandomInt(35, 48) / 10; // Random rating between 3.5 and 4.8

        let randomLang;
        let comment;

        if (randomRegion === 'Andhra Pradesh') {
          // Telugu comments for Andhra Pradesh users
          randomLang = 'Telugu';
          comment = comments[randomLang][Math.floor(Math.random() * comments[randomLang].length)];
        } else if (randomRegion === 'Tamil Nadu') {
          // Tamil comments for Tamil Nadu users
          randomLang = 'Tamil';
          comment = comments[randomLang][Math.floor(Math.random() * comments[randomLang].length)];
        } else if (randomRegion === 'West Bengal') {
          // Bengali comments for West Bengal users
          randomLang = 'Bengali';
          comment = comments[randomLang][Math.floor(Math.random() * comments[randomLang].length)];
        } else {
          // Hindi comments for Northern states users
          randomLang = 'Hindi';
          comment = comments[randomLang][Math.floor(Math.random() * comments[randomLang].length)];
        }

        reviews.push({
          user,
          rating,
          comment,
          createdAt: new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 120))), // Random date between November 2024 and March 2025
        });
      }

      // Update the product with generated reviews
      product.reviews = reviews;
      await product.save();

      console.log(`Successfully generated reviews for product: ${product.name}`);
    }
  } catch (error) {
    console.error('Error generating reviews:', error);
  }
});







router.get('/categories', getAllUniqueCategories);

// Create a new product
router.post('/', createProduct);

// Get all products with optional filters
router.get('/', getAllProducts);

// Get a single product by ID
router.get('/:id', getProductById);

// Update a product by ID
router.put('/:id', updateProduct);

// Delete (archive) a product by ID
router.delete('/:id', deleteProduct);

// Add a review to a product
router.post('/:id/reviews', addReview);

// Get inventory details for a product across all warehouses
router.get('/:id/inventory', getProductInventory);



// Get top-selling products
// router.get('/top-selling', getTopSellingProducts);


router.put('/:productId/variants', updateVariants);

module.exports = router;
