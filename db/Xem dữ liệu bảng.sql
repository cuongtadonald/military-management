SELECT * FROM Role;
SELECT * FROM Rank;
SELECT * FROM Status;
SELECT * FROM Religion;
SELECT * FROM MaritalStatus;
SELECT * FROM Province;
SELECT * FROM Ward;
---Đơn vị
SELECT 
    *
FROM OrganizationUnit
ORDER BY UnitLevel, UnitID;
---Tài khoản
SELECT 
    U.UserID,
    U.Username,
    U.FullName,
    R.RoleName,
    U.UnitID
FROM [User] U
LEFT JOIN Role R ON U.RoleID = R.RoleID;

SELECT 
    UP.PermissionID,
    U.Username,
    R.RoleName,
    UP.PermissionLevel
FROM UserPermission UP
JOIN [User] U ON UP.UserID = U.UserID
JOIN Role R ON UP.RoleID = R.RoleID;

--- Thông tin chiến sĩ
SELECT
    s.SoldierID,
    s.FullName,
    s.DateOfBirth,
    s.Gender,
    s.CitizenID,

    ou.UnitName,
    s.Position,
    r.RankName,
    st.StatusName,

    s.Ethnicity,
    rel.ReligionName,
    ms.MaritalStatusName,

    s.EducationLevel,
    s.Specialization,
    s.PoliticalLevel,

    s.BloodType,
    s.HealthClassification,

    s.Height,
    s.Weight,
    s.BloodPressure,

    s.Hometown,

    s.Address,
    w.WardName AS CurrentWard,
    p.ProvinceName AS CurrentProvince,

    s.EnlistmentDate,
    s.PartyJoinDate,
    s.YouthUnionJoinDate,

    s.PhotoPath,
    s.FileID,

    s.CreatedDate,
    s.CreatedBy,
    s.LastModifiedDate,
    s.LastModifiedBy,
	st.Description
FROM Soldier s
LEFT JOIN OrganizationUnit ou
    ON s.UnitID = ou.UnitID
LEFT JOIN Rank r
    ON s.RankID = r.RankID
LEFT JOIN Status st
    ON s.StatusID = st.StatusID
LEFT JOIN Religion rel
    ON s.ReligionID = rel.ReligionID
LEFT JOIN MaritalStatus ms
    ON s.MaritalStatusID = ms.MaritalStatusID
LEFT JOIN Ward w
    ON s.WardID = w.WardID
LEFT JOIN Province p
    ON s.ProvinceID = p.ProvinceID;

---Thân nhân
SELECT 
    F.FamilyID,
    F.SoldierID,
    S.FullName AS SoldierName,
    F.FullName AS FamilyName,
    F.Relationship,
    F.PhoneNumber
FROM SoldierFamily F
JOIN Soldier S ON F.SoldierID = S.SoldierID
ORDER BY F.SoldierID;

