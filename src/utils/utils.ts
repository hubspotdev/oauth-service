export function getCustomerId():string{
  return '1'
}

export function getServerPort():number{
  return Number(process.env.PORT) || 3001; // Default to port 3001 if not declared in .env
}
