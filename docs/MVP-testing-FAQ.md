# MVP Testing FAQ
Please find below a brief FAQ to help you get started with MVP testing.

## Getting started
**What should we test?**  
You will test the three main functionalities of the Identity Management MVP:
* Ability to register to PACT Network 
* Ability to find others on PACT Network 
* Ability to connect to others (“authentication as a service”) 

**Where can I find detailed testing instructions?**  
https://github.com/wbcsd/pact-directory/blob/main/docs/integration-guide.md  

**What Company Name  / Company Identifier should I register?**  
In this first phase of testing, you will register a dummy account to the IM Service and authenticate with PACT’s demo solution. To keep things simple, please register your actual company name and a real company identifier of your company. 

**What Registration Code should I use?**  
PACT will provide you with a registration code via email. 

**Who am I testing with?**  
In this first phase of testing, you will test with a demo solution PACT is creating. Discuss with PACT which role you wish to test (data recipient or data owner). In future phases of testing, we will evolve into higher complexity (and more realistic) testing scenarios, including solution to solution and ultimately Customer to Supplier. 

**What testing environment should I use?**  
Identity Management MVP is being tested in a non-prod environment, therefore we recommend you use your Solution's non prod environment as well for testing (i.e. use a Non-prod Solution API URL).

**What if I have questions?**  
We hope you do! Please write to both Jose Marmolejos <consultant-marmolejos@wbcsd.org> and Beth Hadley <hadley@wbcsd.org>. We are happy to arrange a call and/or setup a teams chat to work through any issues. 

**How should I share feedback?**  
As you conduct testing, please take notes of any feedback you and your team encounters – about anything! We will also collect feedback throughout the testing process as we interact with you and address your questions. Once testing is complete, we will schedule a call with you to debrief your testing experience

**What is the testing timeline?**  
We aim for at least 3 organizations to complete testing by end of February, however we recognize testing organizations are voluntarily testing and have many competing priorities. We just ask you share with us your expectations regarding a realistic timeline for completing testing, in case you do not think end of February is realistic. 

## Technical Questions
**How is the access token signed? What standard libraries are used, how are secrets stored and managed?**
* Documentation is being prepared.

 
