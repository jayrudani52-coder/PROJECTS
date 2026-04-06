import java.util.*;

class Account 
{
    String AccountNumber;
    String Name;
    double Balance;
    String Pin;
    static int transactionIdCounter =1314562879; 
	
    Account(String AccountNumber, String Name, double Balance, String Pin)
	{
        this.AccountNumber = AccountNumber;
        this.Name = Name;
        this.Balance = Balance;
        this.Pin = Pin;
    }

    static int generateTransactionId() 
	{
        return transactionIdCounter++;
    }
	
    void printSlip(String transactionType, double amount, int transactionId) 
	{
        System.out.println("\n----------------------- Transaction Slip -----------------------");
        System.out.println("     Account Number: " + this.AccountNumber);
        System.out.println("     Account Holder: " + this.Name);
        System.out.println("     Transaction Type: " + transactionType);
        System.out.println("     Amount: " + amount);
        System.out.println("     Transaction ID: TRNSCTNID" + transactionId);
        System.out.println("     New Balance: " + this.Balance);
        System.out.println("------------------------------------------------------\n");
    }

    void search(Account[] arobj)
	{
        Scanner sc = new Scanner(System.in);
		System.out.println("*                             *");
		System.out.println("*                             *");
		System.out.println("*  Welcome to our ATM System  *");
		System.out.println("*                             *");
		System.out.println("*                             *");
        System.out.println("Enter Your Account Number:");
        String search = sc.next();
        sc.nextLine(); 
        boolean found = false;

        for (int j = 0; j < arobj.length; j++)
		{
            if (search.equals(arobj[j].AccountNumber))
			{
                System.out.println("Enter your PIN:");
                String inputPin = sc.nextLine();
                if (!inputPin.equals(arobj[j].Pin))
				{
                    System.out.println("Incorrect PIN. Access denied.");
                    return;
                }

                System.out.println("Account found! Balance: " + arobj[j].Balance);
                boolean exit = false;

                while (!exit) 
				{
					System.out.println();
                    System.out.println("Enter 1 for withdrawal");
                    System.out.println("Enter 2 for deposit");
                    System.out.println("Enter 3 for change PIN");
                    System.out.println("Enter 4 to exit");
					
                    int choice = sc.nextInt();
                    sc.nextLine(); 

                    switch (choice) 
					{
                        case 1:
                            System.out.println("Enter balance you want to withdraw:");
                            double withd = sc.nextDouble();
                            if (withd > arobj[j].Balance) 
							{
                                System.out.println("You don't have that much amount.");
                            }
							else
							{
                                arobj[j].Balance -= withd;
                                int transactionId = generateTransactionId(); 
                                arobj[j].printSlip("Withdrawal", withd, transactionId); 
                            }
                            break;
                        case 2:
                            System.out.println("Enter balance you want to add:");
                            double dep = sc.nextDouble();
                            arobj[j].Balance += dep;
                            int transactionId = generateTransactionId(); 
                            arobj[j].printSlip("Deposit", dep, transactionId); 
                            break;
                        case 3:
                            System.out.println("Enter your current PIN:");
                            String crrpin = sc.nextLine();
                            if (crrpin.equals(arobj[j].Pin)) 
							{
                                boolean valid = false;
                                while (!valid) 
								{
                             
							 System.out.println("Enter a new 4-digit numeric PIN:");
                                    String newPin = sc.nextLine();
                                    
                                    if (newPin.length() == 4) 
									{
                                        boolean b = true;
                                        boolean B = true;
                                        
                                        for (int i = 0; i < newPin.length(); i++) 
										{
                                            if (!(newPin.charAt(i) >= '0' && newPin.charAt(i) <= '9')) 
											{
                                                b = false;
                                                break;
                                            }
                                            if (i > 0 && newPin.charAt(i) != newPin.charAt(i - 1)) {
                                                B = false;
                                            }
                                        }

                                        if (!b)
										{
                                            System.out.println("Invalid PIN. Please enter a valid 4-digit numeric PIN.");
                                        } 
										else if (B) 
										{
                                            System.out.println("Invalid PIN. PIN should not contain all identical digits(Ex.1111)Because of security purpose");
                                        } 
										else 
										{
                                            arobj[j].Pin = newPin;
                                            System.out.println("PIN changed successfully.");
                                            valid = true;
                                        }
                                    } 
									else 
									{
                                        System.out.println("Invalid PIN length. Please enter a 4-digit PIN.");
                                    }
                                }
                            } 
							else 
							{
                                System.out.println("Incorrect current PIN. PIN change failed.");
                            }
                            break;
                        case 4:
                            exit = true;
                            System.out.println("Exiting...");
							System.out.println("Thank You for visiting our System, Have a Nice Day");
                            break;
                        default:
                            System.out.println("Please enter a valid number.");
                    }
                }
                found = true;
                break;
            }
        }

        if (!found) 
		{
            System.out.println("Account not found.");
        }
    }
}

class ATM 
{
    public static void main(String[] args)
	{
        Account[] arobj = new Account[5];

        arobj[0] = new Account("1234567891", "Pratham", 5000.0, "1234");
        arobj[1] = new Account("1234567892", "Dikshant", 6000.0, "1235");
        arobj[2] = new Account("1234567893", "Deep", 7000.0, "1236");
        arobj[3] = new Account("1234567894", "Jay", 8000.0, "1237");
        arobj[4] = new Account("1234567895", "Dharmil", 9000.0, "1238");
      
        arobj[0].search(arobj);
    }
}