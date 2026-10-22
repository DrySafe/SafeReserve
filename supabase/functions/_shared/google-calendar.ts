// Server-only Google Calendar adapter. Call from an authorized orchestration step;
// refresh/access tokens must live in the server's credential store, never VITE_*.
export async function refreshGoogleToken({clientId,clientSecret,refreshToken}:{clientId:string;clientSecret:string;refreshToken:string},request=fetch) {
 const response=await request('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'})});
 if(!response.ok)throw new Error('Google OAuth refresh failed');
 const result=await response.json();if(!result.access_token)throw new Error('Google OAuth returned no token');return result.access_token as string;
}
export async function syncGoogleEvent({accessToken,calendarId,booking,tenantName,timeZone,cancelled=false}:{accessToken:string;calendarId:string;booking:{id:string;starts_at:string;ends_at:string;services:{name:string}[]};tenantName:string;timeZone:string;cancelled?:boolean},request=fetch) {
 // Google accepts lowercase base32hex IDs; UUID hex is a valid subset. Stable IDs make retries idempotent.
 const id=booking.id.replaceAll('-','').toLowerCase();
 if(!/^[0-9a-f]{32}$/.test(id))throw new Error('Invalid booking ID');
 const collection=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
 const headers={Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'};
 if(cancelled){const response=await request(`${collection}/${id}?sendUpdates=all`,{method:'DELETE',headers});if(!response.ok&&![404,410].includes(response.status))throw new Error('Google event cancellation failed');return;}
 const payload={summary:`${booking.services.map(s=>s.name).join(' + ')} · ${tenantName}`,description:`Agendamento SafeReserve ${booking.id}`,start:{dateTime:booking.starts_at,timeZone},end:{dateTime:booking.ends_at,timeZone}};
 const update=await request(`${collection}/${id}?sendUpdates=all`,{method:'PATCH',headers,body:JSON.stringify(payload)});
 if(update.ok)return;
 if(update.status!==404)throw new Error('Google event update failed');
 const create=await request(`${collection}?sendUpdates=all`,{method:'POST',headers,body:JSON.stringify({id,...payload})});
 if(create.status===409){const retry=await request(`${collection}/${id}?sendUpdates=all`,{method:'PATCH',headers,body:JSON.stringify(payload)});if(!retry.ok)throw new Error('Google event reconciliation failed');}
 else if(!create.ok)throw new Error('Google event creation failed');
}
